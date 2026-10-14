use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDescriptor {
    pub name: String,
    pub format: String, // "VST3" | "CLAP" | "LV2"
    pub path: String,
    pub category: String,
    pub vendor: String,
}

pub fn scan_linux_plugins() -> Vec<PluginDescriptor> {
    let mut plugins = Vec::new();

    // Standard plugin paths on Linux
    let mut search_paths = vec![
        PathBuf::from("/usr/lib/vst3"),
        PathBuf::from("/usr/local/lib/vst3"),
        PathBuf::from("/usr/lib/clap"),
        PathBuf::from("/usr/local/lib/clap"),
        PathBuf::from("/usr/lib/lv2"),
    ];

    if let Ok(home) = std::env::var("HOME") {
        search_paths.push(PathBuf::from(format!("{}/.vst3", home)));
        search_paths.push(PathBuf::from(format!("{}/.clap", home)));
        search_paths.push(PathBuf::from(format!("{}/.lv2", home)));
    }

    for base_dir in search_paths {
        if !base_dir.exists() {
            continue;
        }

        scan_directory(&base_dir, &mut plugins);
    }

    plugins
}

fn scan_directory(dir: &Path, plugins: &mut Vec<PluginDescriptor>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if path.is_dir() {
            if file_name.ends_with(".vst3") {
                let name = file_name.trim_end_matches(".vst3").to_string();
                plugins.push(PluginDescriptor {
                    name,
                    format: "VST3".to_string(),
                    path: path.to_string_lossy().to_string(),
                    category: "Effect/Instrument".to_string(),
                    vendor: "Linux Native".to_string(),
                });
            } else if file_name.ends_with(".lv2") {
                let name = file_name.trim_end_matches(".lv2").to_string();
                plugins.push(PluginDescriptor {
                    name,
                    format: "LV2".to_string(),
                    path: path.to_string_lossy().to_string(),
                    category: "Linux LV2".to_string(),
                    vendor: "Linux Native".to_string(),
                });
            } else {
                // Recursively check subdirectories
                scan_directory(&path, plugins);
            }
        } else if path.is_file() && file_name.ends_with(".clap") {
            let name = file_name.trim_end_matches(".clap").to_string();
            plugins.push(PluginDescriptor {
                name,
                format: "CLAP".to_string(),
                path: path.to_string_lossy().to_string(),
                category: "Modern CLAP".to_string(),
                vendor: "Linux Native".to_string(),
            });
        }
    }
}
