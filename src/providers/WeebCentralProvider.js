import { PlaywrightUtils } from '../utils/PlaywrightUtils.js';
import { Logger } from '../utils/Logger.js';
import Provider from '../Provider.js';
import archiver from 'archiver';

export default class WeebCentralProvider extends Provider {
    constructor() {
        super();
        this.name = 'Manga (WeebCentral)';
        this.id = 'weebcentral';
        this.icon = 'data:image/png;base64,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';
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