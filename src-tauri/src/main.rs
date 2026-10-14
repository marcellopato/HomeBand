#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio_engine;
mod plugin_scanner;

use audio_engine::{get_available_audio_devices, get_host_id, save_wav_to_file, AudioDeviceDescriptor};
use plugin_scanner::{scan_linux_plugins, PluginDescriptor};

#[tauri::command]
fn get_audio_devices() -> Result<Vec<AudioDeviceDescriptor>, String> {
    get_available_audio_devices()
}

#[tauri::command]
fn scan_installed_plugins() -> Vec<PluginDescriptor> {
    scan_linux_plugins()
}

#[tauri::command]
fn get_linux_audio_backend() -> String {
    get_host_id()
}

#[tauri::command]
fn export_wav_file(file_path: String, sample_rate: u32, channels: u16, samples: Vec<f32>) -> Result<String, String> {
    save_wav_to_file(&file_path, sample_rate, channels, &samples)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_audio_devices,
            scan_installed_plugins,
            get_linux_audio_backend,
            export_wav_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running homeband tauri application");
}
