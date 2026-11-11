use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

/// The interface opens the database by this name (src/app/storage.ts).
const DATABASE: &str = "sqlite:keyed.db";

/// Schema migrations, run by the SQL plugin when the database is opened.
/// Add new ones at the end; never change a migration that has been released.
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create tables",
        sql: include_str!("../migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }]
}

pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch focuses the running window instead.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        // Daily goal reminders (src/app/reminders.ts).
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DATABASE, migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running the KeyEd application");
}
