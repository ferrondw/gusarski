![](public/assets/images/banner.png)

---

**Provider-based Node.js media downloader**

# Requirements

- [Node.js](https://nodejs.org/en)


# Setup

1. Clone or download this repository
2. Run `npm i`, `npx playwright install`, and `node index.js`.
3. Open [http://localhost:3000](http://localhost:3000) in your browser


# Environment Variables

```sh
# If port 3000 is already in use, change this until it works
PORT=3000

# Sets the limit on how many jobs happen before they get put on pending in the queue
QUEUE_BATCH_LIMIT=5
```

> [!NOTE]
> All environment variables are optional. The server works even if there is no `.env` file


# Good To Know
- Downloads are stored on the server where this is hosted. Clients cannot directly obtain or delete them
- This project uses web scraping. The websites scraped are not designed for this purpose, so errors can and probably will occur
- Some providers are error-prone and downloads can fail. Use the "Retry" button in the sidebar if needed