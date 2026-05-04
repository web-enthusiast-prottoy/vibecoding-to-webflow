This is a [Next.js](https://nextjs.org) project bootstrapped with [`webflow cloud init`](https://developers.webflow.com/webflow-cloud/intro).

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, export your Webflow components:

```bash
webflow devlink export
```

This will create the `src/webflow/` directory with your Webflow components and styles.

Finally, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Webflow Components

Your Webflow components are exported to `src/webflow/`. To update them when you make changes in Webflow:

```bash
webflow devlink export
```

Learn more about [Webflow DevLink](https://developers.webflow.com/data/docs/devlink-overview).

## Deployment

Deploy your app by running:

```bash
webflow cloud deploy
```

Learn more about [Webflow Cloud deployment](https://developers.webflow.com/webflow-cloud/environment).
