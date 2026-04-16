# Designer Extension Starter: TypeScript (Alt)

Explore the [documentation](https://developers.webflow.com/designer/reference/introduction) for in-depth information about Designer Extension features and API.

## Development

```bash
npm run dev
```

This command installs dependencies, watches for changes in the `src/` folder, recompiles TypeScript files, and serves your extension files from `public/`. Use the displayed URL as the "Development URL" in Webflow Designer's Apps panel to launch your extension.

## Deployment

```bash
npm run build
```

This command prepares a `${bundleFile}` in the root folder. Upload this `bundle.zip` file for distributing the App inside of your workspace or via the Marketplace.
