import { PlaywrightUtils } from '../utils/PlaywrightUtils.js';
import { Logger } from '../utils/Logger.js';
import Provider from '../Provider.js';
import archiver from 'archiver';

export default class WeebCentralProvider extends Provider {
    constructor() {
        super();
        this.name = 'Manga (WeebCentral)';
        this.id = 'weebcentral';
        this.defaultPosterType = 'book';
        this.category = 'Manga';
        this.searchPlaceholder = 'Search manga...';
    }

    async search(query) {
        const browser = await PlaywrightUtils.newBrowser(false);
        const page = await browser.newPage();
        try {
            await page.goto('https://weebcentral.com/', { waitUntil: 'networkidle' });
            const input = page.locator('#quick-search-input');
            await input.waitFor({ timeout: 10000 });
            await input.fill(query);
            await page.waitForSelector('#quick-search-result .btn.join-item', { timeout: 10000 });
            const results = await page.$$eval('#quick-search-result .btn.join-item', nodes => {
                return nodes.map(node => {
                    const titleDiv = node.querySelector('.flex-1');
                    const title = titleDiv ? titleDiv.textContent.trim() : '';
                    const link = node.getAttribute('href');
                    let poster = '';
                    const img = node.querySelector('img');
                    if (img) poster = img.getAttribute('src');
                    return {
                        title,
                        poster,
                        url: link
                    };
                });
            });
            return results;
        } finally {
            await browser.close();
        }
    }

    async download(task) {
        const browser = await PlaywrightUtils.newBrowser(false);
        const page = await browser.newPage();
        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        const { FolderNameSanitizer } = await import('../utils/FolderNameSanitizer.js');
        try {
            await page.goto(task.data.url, { waitUntil: 'networkidle' });
            task.addMessage('Loaded manga page. Extracting metadata and chapters...');

            const metadata = await page.evaluate(() => {
                const info = {};
                const section = document.querySelector('section ul');
                if (!section) return info;

                const items = section.querySelectorAll('li');
                items.forEach(li => {
                    const strong = li.querySelector('strong');
                    if (!strong) return;
                    const label = strong.textContent.replace(':', '').trim();

                    if (label === 'Author(s)') {
                        info.authors = Array.from(li.querySelectorAll('a')).map(a => a.textContent.trim());
                    } else if (label === 'Tags(s)') {
                        info.tags = Array.from(li.querySelectorAll('a')).map(a => a.textContent.trim());
                    } else if (label === 'Type') {
                        const link = li.querySelector('a');
                        info.type = link ? link.textContent.trim() : '';
                    } else if (label === 'Status') {
                        const link = li.querySelector('a');
                        info.status = link ? link.textContent.trim() : '';
                    } else if (label === 'Released') {
                        const span = li.querySelector('span');
                        info.year = span ? span.textContent.trim() : '';
                    }
                });
                return info;
            });

            var showAllChaptersButton = page.locator('button', { hasText: 'Show All Chapters' });
            if (await showAllChaptersButton.count() > 0) {
                await showAllChaptersButton.click();
                await page.waitForTimeout(3000);
            }

            let chapters = await page.$$eval('#chapter-list a[href*="/chapters/"]', nodes =>
                nodes.map(node => {
                    const chapterSpan = node.querySelector('span span');
                    let title = chapterSpan ? chapterSpan.textContent.trim() : node.textContent.trim();
                    title = title.replace(/\s+/g, ' ').replace(/[^\w\d\-_. ]/g, '').trim();
                    return {
                        url: node.href,
                        title
                    };
                })
            );
            if (!chapters.length) throw new Error('No chapters found');
            if (chapters.length > 1 && chapters[0].title > chapters[chapters.length - 1].title) {
                chapters = chapters.reverse();
            }
            task.addMessage(`Found ${chapters.length} chapters. Downloading from first to last...`);

            for (let c = 0; c < chapters.length; c++) {
                const chapter = chapters[c];
                await page.goto(chapter.url, { waitUntil: 'networkidle' });
                task.addMessage(`Opened chapter: ${chapter.title}`);

                const imageUrls = await page.$$eval('section img[src]', imgs => imgs.map(img => img.src).filter(src => !src.endsWith('/brand.png')));
                if (!imageUrls.length) {
                    Logger.warning(`No images found in chapter: ${chapter.title}`);
                    continue;
                }
                task.addMessage(`Found ${imageUrls.length} images. Downloading...`);

                const baseDir = path.join('downloads', this.id, FolderNameSanitizer.sanitize(task.data.title), FolderNameSanitizer.sanitize(chapter.title));
                fs.mkdirSync(baseDir, { recursive: true });

                const firstImg = imageUrls[0];
                const match = firstImg.match(/(.+\/)(\d{4})-(\d{3,4})\.\w+$/);
                let cdnPrefix = null, ext = null;
                if (match) {
                    cdnPrefix = match[1];
                    ext = firstImg.split('.').pop().split('?')[0];
                }

                const imageFiles = [];
                for (let i = 0; i < imageUrls.length; i++) {
                    let imgUrl = imageUrls[i];
                    let imgName = imgUrl.split('/').pop().split('?')[0];
                    if (cdnPrefix && ext) {
                        const chapMatch = imgName.match(/(\d{4})-(\d{3,4})/);
                        let chapNum = chapMatch ? chapMatch[1] : null;
                        let pageNum = (i + 1).toString().padStart(3, '0');
                        if (chapNum) {
                            imgUrl = `${cdnPrefix}${chapNum}-${pageNum}.${ext}`;
                            imgName = `${pageNum}.${ext}`;
                        }
                    }
                    const imgPath = path.join(baseDir, imgName);
                    try {
                        await page.goto(imgUrl, { timeout: 30000 });
                        const buffer = await page.evaluate(() => fetch(window.location.href).then(r => r.ok ? r.arrayBuffer() : Promise.reject('Failed')).then(b => new Uint8Array(b)));
                        fs.writeFileSync(imgPath, Buffer.from(buffer));
                        imageFiles.push(imgPath);
                        task.addMessage(`Downloaded image ${i + 1}/${imageUrls.length}`);
                    } catch (err) {
                        Logger.warning(`Failed to download image: ${imgUrl}`);
                    }
                }

                const comicInfoXml = this.generateComicInfo(task.data.title, chapter.title, c + 1, metadata, imageFiles.length);

                try {
                    const cbzPath = path.join(path.dirname(baseDir), `${FolderNameSanitizer.sanitize(chapter.title)}.cbz`);
                    const output = fs.createWriteStream(cbzPath);
                    const archive = archiver('zip', { zlib: { level: 9 } });

                    await new Promise((resolve, reject) => {
                        output.on('close', resolve);
                        archive.on('error', reject);

                        archive.pipe(output);

                        archive.append(comicInfoXml, { name: 'ComicInfo.xml' });

                        for (const file of imageFiles) {
                            archive.file(file, { name: path.basename(file) });
                        }

                        archive.finalize();
                    });

                    task.addMessage(`Packed chapter into CBZ: ${cbzPath}`);

                    for (const file of imageFiles) {
                        try {
                            fs.unlinkSync(file);
                        } catch (err) {
                            Logger.warning(`Failed to delete image file: ${file}`);
                        }
                    }
                    try {
                        fs.rmdirSync(baseDir);
                    } catch (err) {
                        Logger.warning(`Failed to remove chapter directory: ${baseDir}`);
                    }
                } catch (err) {
                    Logger.warning(`Failed to pack CBZ for chapter: ${chapter.title}`, err);
                }
                task.addMessage(`Chapter ${chapter.title} download complete.`);
            }
            task.addMessage('All chapters downloaded.');
        } catch (err) {
            Logger.error('Download failed', err);
            throw err;
        } finally {
            await browser.close();
        }
    }

    generateComicInfo(seriesTitle, chapterTitle, chapterNumber, metadata, pageCount) {
        const authors = metadata.authors ? metadata.authors.join(', ') : '';
        const tags = metadata.tags ? metadata.tags.join(', ') : '';
        const year = metadata.year || '';
        const type = metadata.type || 'Manga';
        
        return `<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Series>${this.escapeXml(seriesTitle)}</Series>
  <Number>${chapterNumber}</Number>
  <Title>${this.escapeXml(chapterTitle)}</Title>
  <Writer>${this.escapeXml(authors)}</Writer>
  <PageCount>${pageCount}</PageCount>
  <Year>${year}</Year>
  <Genre>${this.escapeXml(tags)}</Genre>
  <Manga>${type === 'Manga' ? 'Yes' : 'No'}</Manga>
</ComicInfo>`;
    }

    escapeXml(str) {
        if (!str) return '';
        return str.replace(/[<>&'"]/g, c => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }
}