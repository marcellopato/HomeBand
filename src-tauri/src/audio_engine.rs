use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceDescriptor {
    pub name: String,
    pub is_default: bool,
    pub is_input: bool,
    pub max_channels: u16,
    pub default_sample_rate: u32,
    pub supported_sample_rates: Vec<u32>,
}

pub fn get_available_audio_devices() -> Result<Vec<AudioDeviceDescriptor>, String> {
    let host = cpal::default_host();
    let mut devices = Vec::new();

    let default_in = host.default_input_device().and_then(|d| d.name().ok());
    let default_out = host.default_output_device().and_then(|d| d.name().ok());

    // Enumerate output devices
    if let Ok(output_devices) = host.output_devices() {
        for dev in output_devices {
            if let Ok(name) = dev.name() {
                let is_default = default_out.as_ref() == Some(&name);
                let (max_channels, default_sample_rate, supported_sample_rates) =
                    match dev.default_output_config() {
                        Ok(cfg) => (
                            cfg.channels(),
                            cfg.sample_rate().0,
                            vec![44100, 48000, 88200, 96000],
                        ),
                        Err(_) => (2, 48000, vec![44100, 48000]),
                    };

                devices.push(AudioDeviceDescriptor {
                    name,
                    is_default,
                    is_input: false,
                    max_channels,
                    default_sample_rate,
                    supported_sample_rates,
                });
            }
        }
    }

    // Enumerate input devices
    if let Ok(input_devices) = host.input_devices() {
        for dev in input_devices {
            if let Ok(name) = dev.name() {
                let is_default = default_in.as_ref() == Some(&name);
                let (max_channels, default_sample_rate, supported_sample_rates) =
                    match dev.default_input_config() {
                        Ok(cfg) => (
                            cfg.channels(),
                            cfg.sample_rate().0,
                            vec![44100, 48000, 88200, 96000],
                        ),
                        Err(_) => (2, 48000, vec![44100, 48000]),
                    };

                devices.push(AudioDeviceDescriptor {
                    name,
                    is_default,
                    is_input: true,
                    max_channels,
                    default_sample_rate,
                    supported_sample_rates,
                });
            }
        }
    }

    Ok(devices)
}

pub fn get_host_id() -> String {
    let host = cpal::default_host();
    format!("{:?}", host.id())
}

pub fn save_wav_to_file(
    file_path: &str,
    sample_rate: u32,
    channels: u16,
    samples: &[f32],
) -> Result<String, String> {
    let spec = hound::WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };

    let mut writer = hound::WavWriter::create(file_path, spec)
        .map_err(|e| format!("Failed to create WAV file: {}", e))?;

    for &sample in samples {
        writer
            .write_sample(sample)
            .map_err(|e| format!("Failed to write audio frame: {}", e))?;
    }

    writer
        .finalize()
        .map_err(|e| format!("Failed to finalize WAV file: {}", e))?;

    Ok(format!("Saved {} samples to {}", samples.len(), file_path))
}
