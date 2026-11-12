#!/bin/bash
# Stores the six APPLE_* repository secrets that .github/workflows/release.yml
# reads for Developer ID signing and notarization.
#
# Without arguments it takes the Developer ID Application certificate from the
# keychain: macOS asks for the login password to allow the export, and the
# exported file lives in a temporary folder under a random password. With a
# path it uses that .p12 and asks for its password.
#
# The certificate and the Apple credentials are checked on this Mac first, and
# nothing is uploaded unless every check passes. Passwords are typed at hidden
# prompts and reach gh through standard input; the checks hand them to
# `security` and `notarytool` as arguments, the way the release build does.
#
# Usage: tools/set-apple-secrets.sh [path/to/certificate.p12]
#
# macOS runs this with bash 3.2, which reads a non-ASCII character right after
# $NAME as part of the name: write ${NAME} before Russian text and punctuation.
set -euo pipefail

fail() {
  echo "Ошибка: $*" >&2
  exit 1
}

cd "$(dirname "$0")/.."
[ -t 0 ] && [ -t 2 ] || fail "скрипт задаёт вопросы, запустите его в окне терминала."
command -v gh >/dev/null || fail "не найден gh. Установите его: brew install gh"
gh auth status >/dev/null 2>&1 || fail "gh не вошёл в GitHub. Выполните: gh auth login"
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
echo "Репозиторий: $REPO"

WORK="$(mktemp -d)"
KEYCHAIN="$WORK/check.keychain-db"
cleanup() {
  security delete-keychain "$KEYCHAIN" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
# A closed terminal window or Ctrl-C must not leave the exported key behind.
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

if [ $# -ge 1 ]; then
  P12="$1"
  [ -f "$P12" ] || fail "нет файла $P12."
  echo "Сертификат:  $P12"
  echo
  IFS= read -r -s -p "Пароль файла .p12: " P12_PASSWORD
  echo
  [ -n "$P12_PASSWORD" ] || fail "пустой пароль. Экспортируйте .p12 заново и задайте пароль."
else
  HASHES="$(security find-identity -v -p codesigning |
    sed -n 's/^ *[0-9]*) \([0-9A-F]*\) "Developer ID Application: .*$/\1/p' | sort -u)"
  FOUND="$(printf '%s\n' "$HASHES" | grep -c . || true)"
  [ "$FOUND" -ge 1 ] || fail "в связке ключей нет действующего сертификата Developer ID Application. Создайте его в Xcode: Settings → Accounts → Manage Certificates."
  [ "$FOUND" -eq 1 ] || fail "в связке ключей несколько сертификатов Developer ID Application. Экспортируйте нужный в .p12 и передайте путь к файлу."

  echo "Готовлю сертификат из связки ключей…"
  cat >"$WORK/export-identity.swift" <<'SWIFT'
import CryptoKit
import Foundation
import Security

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\n").utf8))
  exit(1)
}

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
  fail("usage: export-identity <certificate sha1> <output.p12>")
}
guard let passphrase = ProcessInfo.processInfo.environment["KEYED_P12_PASSWORD"], !passphrase.isEmpty
else {
  fail("KEYED_P12_PASSWORD is not set")
}

let query: [String: Any] = [
  kSecClass as String: kSecClassIdentity,
  kSecMatchLimit as String: kSecMatchLimitAll,
  kSecReturnRef as String: true,
]
var found: CFTypeRef?
let status = SecItemCopyMatching(query as CFDictionary, &found)
guard status == errSecSuccess, let items = found as? [AnyObject] else {
  fail("no signing identities found (\(status))")
}

func sha1(_ identity: SecIdentity) -> String? {
  var certificate: SecCertificate?
  guard SecIdentityCopyCertificate(identity, &certificate) == errSecSuccess, let certificate else {
    return nil
  }
  let der = SecCertificateCopyData(certificate) as Data
  return Insecure.SHA1.hash(data: der).map { String(format: "%02X", $0) }.joined()
}

let wanted = arguments[1].uppercased()
guard let identity = items.map({ $0 as! SecIdentity }).first(where: { sha1($0) == wanted }) else {
  fail("identity \(wanted) not found")
}

var parameters = SecItemImportExportKeyParameters()
parameters.version = UInt32(SEC_KEY_IMPORT_EXPORT_PARAMS_VERSION)
parameters.passphrase = Unmanaged.passRetained(passphrase as CFString as CFTypeRef)
var exported: CFData?
let exportStatus = SecItemExport(identity, .formatPKCS12, [], &parameters, &exported)
guard exportStatus == errSecSuccess, let exported else {
  fail(SecCopyErrorMessageString(exportStatus, nil) as String? ?? "export failed (\(exportStatus))")
}
guard
  FileManager.default.createFile(
    atPath: arguments[2], contents: exported as Data, attributes: [.posixPermissions: 0o600])
else {
  fail("cannot write \(arguments[2])")
}
SWIFT
  xcrun swiftc -suppress-warnings -O -o "$WORK/keyed-export-certificate" "$WORK/export-identity.swift" ||
    fail "не удалось собрать инструмент экспорта. Проверьте, что установлен Xcode."

  P12="$WORK/certificate.p12"
  P12_PASSWORD="$(uuidgen)$(uuidgen)"
  echo "macOS сейчас спросит пароль от этого Mac, чтобы разрешить экспорт ключа подписи."
  echo "Введите его в появившемся окне и нажмите Allow."
  KEYED_P12_PASSWORD="$P12_PASSWORD" "$WORK/keyed-export-certificate" "$HASHES" "$P12" ||
    fail "сертификат не сохранён: экспорт отклонён или не удался."
fi

# The release build imports the certificate into a temporary keychain and signs
# with the identity it finds there, so the same import is the check.
security create-keychain -p "$(uuidgen)" "$KEYCHAIN"
security import "$P12" -k "$KEYCHAIN" -f pkcs12 -P "$P12_PASSWORD" -T /usr/bin/codesign >/dev/null 2>&1 ||
  fail "не удалось открыть .p12: неверный пароль или повреждённый файл."

IDENTITIES="$(security find-identity -v -p codesigning "$KEYCHAIN" |
  sed -n 's/^ *[0-9]*) [0-9A-F]* "\(.*\)".*$/\1/p')"
COUNT="$(printf '%s\n' "$IDENTITIES" | grep -c . || true)"
[ "$COUNT" -eq 1 ] || fail "в .p12 должно быть ровно одно действующее удостоверение для подписи, найдено: $COUNT. Экспортируйте только сертификат Developer ID Application вместе с ключом и проверьте, что он не истёк."
case "$IDENTITIES" in
  "Developer ID Application: "*) ;;
  *) fail "в .p12 лежит «${IDENTITIES}», а нужен сертификат Developer ID Application." ;;
esac
IDENTITY="$IDENTITIES"
TEAM_ID="$(printf '%s\n' "$IDENTITY" | sed -n 's/.*(\([A-Z0-9]*\))$/\1/p')"
[ -n "$TEAM_ID" ] || fail "не удалось определить Team ID из «${IDENTITY}»."
echo "Сертификат в порядке: $IDENTITY"
echo

read -r -p "Apple ID (почта аккаунта разработчика): " APPLE_ID
[ -n "$APPLE_ID" ] || fail "Apple ID не указан."
IFS= read -r -s -p "Пароль приложения (не пароль от Apple ID): " APPLE_PASSWORD
echo
[ -n "$APPLE_PASSWORD" ] || fail "пароль приложения не указан."

echo "Проверяю вход в службу нотаризации Apple…"
if ! NOTARY_OUTPUT="$(xcrun notarytool history --apple-id "$APPLE_ID" --team-id "$TEAM_ID" --password "$APPLE_PASSWORD" 2>&1)"; then
  echo "$NOTARY_OUTPUT" >&2
  fail "Apple не приняла Apple ID, пароль приложения или Team ID $TEAM_ID."
fi
echo "Apple принимает учётные данные."
echo

echo "Записываю секреты в ${REPO}…"
base64 -i "$P12" | gh secret set APPLE_CERTIFICATE --repo "$REPO"
printf '%s' "$P12_PASSWORD" | gh secret set APPLE_CERTIFICATE_PASSWORD --repo "$REPO"
printf '%s' "$IDENTITY" | gh secret set APPLE_SIGNING_IDENTITY --repo "$REPO"
printf '%s' "$APPLE_ID" | gh secret set APPLE_ID --repo "$REPO"
printf '%s' "$APPLE_PASSWORD" | gh secret set APPLE_PASSWORD --repo "$REPO"
printf '%s' "$TEAM_ID" | gh secret set APPLE_TEAM_ID --repo "$REPO"
echo
echo "Готово: шесть секретов записаны."
if [ $# -ge 1 ]; then
  echo "Файл $P12 сборке больше не нужен: удалите его или уберите в надёжное место."
fi
