![](public/assets/images/banner.png)

---

**Provider based Node.js media downloader which runs on a simple WebUI, so simple in fact that it has:**
No ads, no subscriptions, no hidden fees, no shady redirects, no cloud storage, no default light mode, no fake download buttons, no captchas, no data mining, no tracking, no complicated setups, only 1 cookie and even that is optional and needs to be forcefully set my the admin.

## Features

- Provider Switching, supporting a wide range of sources for downloading all kinds of media, all organised in one place
- One-step Setup, like really it's just one bat file lol
- Optional Authentication, so only users with the password can interact with the server
- Monitoring, the server has logs from current downloads, and the clients can see and manage current downloads (clients cannot remove files, there are no permanent logs, no log files will be saved to your system, it's purely in the console)
- Shortcuts, because why not
- Mobile Support, the site will look good on all your devices
- Customisation, with 9 themes because just light and dark aren't enough for me
- Download Tracking, makes sure you don't download something multiple times (Shift left-clicking a search result will toggle its completed mark)


## Requirements

- [Node.js](https://nodejs.org/en)
- [Git](https://git-scm.com) (and [GitHub Desktop](https://desktop.github.com/download) for ease of use, but not required)
  

## Setup

1. Clone or download this repo (though I would recommend cloning it so you can get updates)
2. Run `LAUNCH.bat`, it will check for git updates, download any missing dependencies, and start the server
3. Open `http://localhost:3000` in your browser (or click [here](http://localhost:3000)), if you are using a custom port, just change the number after localhost:

If the steps above don't work, open an issue explaining your problem and it will be resolved as soon as possible


## Environment Variables

```sh
# BOTH required if you want to use authentication, if any are missing, authentication will be skipped entirely
AUTH_USERNAME=admin
AUTH_PASSWORD=pass

# HIGHLY recommended to put in a long random string for security, will not be used if you are not also using authentication
SESSION_SECRET=secret

# If the server for whatever reason does not start due to port 3000 already being in use (because that is most likely the issue), just change this around until it starts
PORT=3000
```

All variables are optional and the server will still function correctly if there is no `.env` file at all.

## Disclaimer
- All downloads will be stored in the server where it is hosted, clients cannot directly obtain downloaded files or delete them
- This project uses webscraping to obtain data from websites, these websites are not intended to be scraped and errors can occur
- Some providers are really error prone and downloads can fail more often then not, just click the "Retry" button in the sidebar and hope it works