# x2calex

A Chrome extension that adds events to Google Calendar using OpenAI's API to
analyze text content.

## Build Instructions

1. Install dependencies:

```bash
pnpm install
```

2. Build the extension:

```bash
pnpm build
```

After the build completes, the extension files will be generated in the `dist`
directory.

## Installing in Chrome

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` directory created by the build process

## Setting up OpenAI API Key

1. Get your [API key from OpenAI](https://platform.openai.com/api-keys)
2. Click the extension icon and click the settings icon (⚙️) to open the options
   page
3. Enter your API key and save
