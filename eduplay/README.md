# EduPlay — biblioteca educacional

Aplicação web local para organizar e reproduzir videoaulas e audiobooks. Feita com **HTML5, CSS moderno, JavaScript puro e Python/Flask**. Não utiliza frameworks de frontend nem bibliotecas CSS antigas.

## Funcionalidades

- Adicionar arquivos de vídeo e áudio à biblioteca.
- Reproduzir mídias com os controles nativos do navegador.
- Buscar por título, matéria ou descrição.
- Filtrar por videoaulas e audiobooks.
- Excluir conteúdos e seus arquivos locais.
- Salvar o catálogo em `library.json`; os arquivos ficam em `media/`.
- Layout responsivo para desktop e celular.

## Requisitos

- Python 3.10 ou superior (recomendado Python 3.12+).
- Visual Studio Code.
- Navegador atualizado.

## Executar no VS Code

1. Extraia o ZIP e abra a pasta `eduplay` no VS Code.
2. Abra **Terminal → New Terminal**.
3. Crie e ative um ambiente virtual:

   **Windows (PowerShell):**
   ```powershell
   py -m venv .venv
   .venv\\Scripts\\Activate.ps1
   ```

   Se o PowerShell bloquear a ativação, você pode executar o Python do ambiente diretamente ou usar o terminal CMD:
   ```bat
   .venv\\Scripts\\activate.bat
   ```

   **Linux/macOS:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

4. Instale a dependência:
   ```bash
   python -m pip install -r requirements.txt
   ```
5. Inicie o servidor:
   ```bash
   python app.py
   ```
6. Abra `http://127.0.0.1:5000` no navegador.

Para encerrar, volte ao terminal e pressione `Ctrl+C`.

## Formatos aceitos

- **Videoaulas:** MP4, WebM e OGG.
- **Audiobooks:** MP3, WAV, M4A, AAC e OGG.

O navegador precisa oferecer suporte ao codec contido no arquivo. MP4 com H.264/AAC costuma ter ampla compatibilidade; a compatibilidade de outros codecs pode variar. O limite de envio está configurado para 1 GB em `app.py`.

## Estrutura do projeto

```text
eduplay/
├── app.py                 # servidor Python e API REST
├── requirements.txt       # dependência Flask
├── library.json           # catálogo persistente
├── media/                 # arquivos enviados
├── templates/
│   └── index.html         # estrutura HTML5
└── static/
    ├── styles.css         # layout e estilos responsivos
    └── app.js             # filtros, busca, upload e player
```

## Observações

- Esta versão foi pensada para execução local e uso individual. O servidor de desenvolvimento do Flask **não deve ser exposto diretamente à internet**.
- Os arquivos enviados são armazenados sem transcodificação. Se um arquivo não tocar, teste um formato/codec compatível com seu navegador.
- O catálogo e as mídias ficam no computador em que o servidor está rodando. Faça backup de `library.json` e da pasta `media/` se precisar preservar a biblioteca.
- Não inclui contas de usuário, sincronização em nuvem, DRM ou proteção de conteúdo.
