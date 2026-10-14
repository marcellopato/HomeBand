# HomeBand Linux & Web (DSP AudioWorklet) 🎸🥁🎹

Workstation de Áudio Digital (DAW) moderna e multiplataforma, desenhada com foco em Linux e arquitetura híbrida de alto desempenho: **Frontend Reativo em Vue 3 + Tailwind CSS**, **Engine de Áudio Digital em Web Audio API / AudioWorklet DSP** e empacotamento nativo via **Tauri**. Inspirada na estética e fluxo intuitivo do GarageBand.

---

## 🏛️ Arquitetura do Sistema

```
                       ┌──────────────────────────────────────────────┐
                       │      Frontend Reativo (Vue 3 + Pinia)        │
                       │   Timeline / Amp Designer / Drummer Pad      │
                       └──────────────────────┬───────────────────────┘
                                              │ Parâmetros & Transport
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │     AudioEngineManager (Singleton Core)      │
                       │  • Transport Clock (Lookahead Scheduler)     │
                       │  • Summing Bus & Master Limiter (-0.5 dB)    │
                       │  • Direct Monitoring & Buffer Decoder        │
                       └──────────────────────┬───────────────────────┘
                                              │ Bloco de 128 frames
                                              ▼
   ┌──────────────────────────────────────────────────────────────────────────────────┐
   │                       AudioWorklet DSP Thread (Dedicated)                        │
   ├──────────────────────┬────────────────────┬───────────────────┬──────────────────┤
   │ Overdrive Processor  │  Delay Processor   │  Chorus Processor │ Reverb Processor │
   │ (Tanh / Tube Asym)   │  (BPM Damped Tape) │  (Dual LFO Mod)   │ (Freeverb Comb)  │
   └──────────────────────┴────────────────────┴───────────────────┴──────────────────┘
```

### 1. Camada de Áudio Digital & DSP
- **Thread Dedicada (AudioWorklet):** O processamento de sinal roda na thread de áudio de tempo real da Web Audio API, processando buffers em blocos de 128 amostras sem travar a renderização gráfica da UI.
- **Clock de Transporte sem Jitter:** O `AudioEngineManager` adota um escalonador com janela de antecipação (*lookahead scheduler* de 40ms checando 120ms à frente), garantindo precisão de sample para cliques de metrônomo, disparos MIDI e reprodução de pistas.
- **Proteção Master Limiter:** Dynamic Compressor brickwall configurado com joelho rígido e threshold a -0.5 dB para proteção contra *clipping digital* e picos bruscos.

### 2. Módulos do Sistema

#### 🎛️ 1. Multitrack Timeline & Sequenciador (Arranger)
- **Grid Musical Interativo:** Zoom horizontal contínuo (25px a 120px por tempo) e régua com subdivisões de compassos e tempos.
- **Pistas Multipistas:**
  - **Trilhas de Áudio:** Gravação ao vivo de microfone ou interface de áudio USB (`getUserMedia` em modo transparente sem cancelamento de eco destrutivo) e importação de arquivos WAV/MP3 com decodificação de waveform instantânea em canvas.
  - **Trilhas MIDI / Sintetizador:** Visualização de notas em blocos e sintetizador polifônico analógico virtual com filtro ressonante e envelope ADSR.
  - **Controles por Canal:** Mute (M), Solo (S), Record Enable (Arm), Direct Monitoring (escuta em tempo real de latência ultrabaixa), Fader de Volume (com curva logarítmica anti-zipper) e Pan Estéreo.
- **Barra de Transporte & LCD Retro:** Visor LCD estilo GarageBand exibindo Compasso : Tempo : Ticks, cronômetro de tempo decorrido, seletor de BPM com ajuste fino, fórmula de compasso (4/4) e ciclo/looping demarcador amarelo.

#### 🎸 2. Amp Designer & Pedalboard Serial
Cadeia serial completa: `Input Gain -> Stompbox Pedalboard -> Preamp Saturation -> Tone Stack -> Cab Voicing -> Master`.
- **Pedal Overdrive:** Hard/Soft clipping com saturação não linear (`Math.tanh(x)` e modelo assimétrico de válvula para geração de harmônicos pares) e filtro de tone passa-baixas.
- **Pedal Chorus:** Linha de delay modulada em quadratura (90° entre canais L e R para abertura estéreo ampla) com controles de Rate, Depth e Mix.
- **Pedal Delay Analógico:** Delay estéreo com tempo sincronizado ao BPM (`1/4`, `1/8`, `1/8d`, `1/16`), feedback e filtro de atenuação (*damping*) que aquece as repetições simulando fita e *bucket brigade*.
- **Pedal Reverb:** Algoritmo Schroeder/Freeverb com 4 filtros pente paralelos e 2 difusores passa-tudo em cascata.
- **Cabeçote & Gabinete:** Presets rápidos (*Clean American*, *British Crunch*, *High-Gain Lead*) com tone stack de 3 bandas (Bass, Middle, Treble), controle de Presence e emulação de gabinetes 1x12 Vintage, 2x12 Open e 4x12 Heavy Stack.

#### 🥁 3. Drummer Inteligente (Procedural X/Y)
- **Matriz Bidimensional X/Y:**
  - **Eixo X (Simples &harr; Complexo):** Controla a densidade rítmica, transição de colcheias para semicolcheias no chimbal, síncopes de bumbo e inserção de *ghost notes* na caixa.
  - **Eixo Y (Suave &harr; Intenso):** Variação orgânica de velocity, acentuação de aberturas de chimbal e pratos de condução/ataque.
- **Fills Automáticos:** Preenchimentos de viradas a cada 4 ou 8 compassos com descida em tons agudo, médio e surdo.
- **Sintetizador Acústico Integrado:** Geradores DSP para Bumbo (pitch drop senoidal exponencial 140Hz &rarr; 42Hz), Caixa (corpo tonal + explosão de ruído branco), Chimbal Fechado/Aberto, Toms ressonantes e Prato Crash.

#### 🎹 4. Piano Roll & Teclado Virtual
- **Digitação Musical (Musical Typing):** Toque notas diretamente no teclado do computador usando as teclas `A`, `W`, `S`, `E`, `D`, `F`, `T`, `G`, `Y`, `H`, `U`, `J`, `K` (C4 até C5).
- **Suporte USB MIDI Nativo:** Integração com a Web MIDI API detectando teclados controladores USB plug-and-play automaticamente.
- **Snap to Grid & Quantização:** Alinhamento de notas a 1/4, 1/8 ou 1/16 com botão instantâneo de quantização.

---

## 📂 Estrutura de Diretórios

```
HomeBand/
├── public/
│   ├── favicon.svg
│   └── worklets/                      # Scripts DSP AudioWorklet (Thread de Áudio)
│       ├── overdrive-processor.js
│       ├── delay-processor.js
│       ├── chorus-processor.js
│       └── reverb-processor.js
├── src/
│   ├── audio/                         # Engine de Áudio
│   │   ├── AudioEngineManager.ts      # Singleton do AudioContext, Transport & Scheduler
│   │   ├── MasterBus.ts               # Summing Bus, Brickwall Limiter e VU Meter
│   │   ├── TrackNode.ts               # Nós de canal (Volume, Pan, Mute, Solo)
│   │   ├── Metronome.ts               # Metrônomo sintetizado amostra por amostra
│   │   ├── AudioRecorder.ts           # Gravação e Direct Monitoring
│   │   ├── DrumSynthesizer.ts         # Síntese acústica de bateria
│   │   └── SynthEngine.ts             # Sintetizador polifônico virtual
│   ├── dsp/                           # Processamento de Sinal Digital
│   │   ├── DSPMath.ts                 # Algoritmos de ondas, saturação tanh e utilitários
│   │   ├── AudioWorkletLoader.ts      # Carregamento seguro de worklets
│   │   ├── Pedalboard.ts              # Cadeia de pedais serial
│   │   └── AmpDesigner.ts             # Tone Stack e simulação de gabinete
│   ├── stores/                        # Pinia State Management
│   │   ├── projectStore.ts            # Pistas, timeline, zoom, regiões e transporte
│   │   ├── audioStore.ts              # Níveis do Master, gravação e I/O
│   │   ├── ampStore.ts                # Parâmetros do amplificador e pedais
│   │   └── drummerStore.ts            # Matriz X/Y e gerador procedural do Drummer
│   ├── types/
│   │   └── audio.ts                   # Interfaces estritas TypeScript
│   ├── components/
│   │   ├── common/                    # Knobs rotativos táteis e VU Meters
│   │   ├── header/                    # AppHeader e TransportBar com display LCD
│   │   ├── timeline/                  # Arranger, TrackHeader, AudioRegion, MidiRegion
│   │   └── instruments/               # AmpPedalboard, DrummerPad e PianoRollModal
│   ├── App.vue                        # Layout raiz com acabamento em madeira GarageBand
│   ├── main.ts                        # Bootstrap da aplicação
│   └── style.css                      # Tailwind CSS v4 e temas escuros
├── src-tauri/                         # Empacotamento Desktop Linux (Rust / Tauri)
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── src/main.rs
├── vite.config.ts
├── package.json
└── README.md
```

---

## 🚀 Como Executar

### Pré-requisitos
- **Node.js:** v18+ ou superior
- **Rust / Cargo:** (apenas para empacotamento nativo Tauri no Linux)

### Executando no Browser / PWA (Modo Desenvolvimento)
```bash
# Instalar dependências
npm install

# Iniciar servidor Vite com AudioWorklet ativo
npm run dev
```
Acesse `http://localhost:5180` no seu navegador (Chrome, Chromium, Brave, Firefox, Edge).

### Compilar para Produção Web
```bash
npm run build
npm run preview
```

### Empacotar como Binário Nativo Linux (.deb / AppImage)
```bash
# Compilar frontend e empacotar via Tauri
npm run build
cd src-tauri && cargo build --release
```

---

## 🎹 Atalhos do Teclado
- **Barra de Espaço:** Reproduzir / Pausar (*Play/Pause*)
- **Teclas A, W, S, E, D, F, T, G, Y, H, U, J, K:** Tocar notas musicais no sintetizador no Piano Roll (C4 a C5)
- **Duplo Clique em qualquer Knob:** Reseta o parâmetro para o valor padrão

---

## 📄 Licença
Distribuído sob licença privada para **marcellopato**. Desenvolvido com foco em alta fidelidade acústica, baixa latência e engenharia reversa de ponta.
