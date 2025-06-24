import { logger } from '../../logger.js';
import Provider from '../Provider.js';
import fetch from 'node-fetch';
import JSZip from 'jszip';
import { mkdirp } from 'mkdirp';
import path from 'path';
import fs from 'fs';

export default class MangaDexProvider extends Provider {
    constructor() {
        super();
        this.name = 'MangaDex';
        this.id = 'mangadex';
        this.icon = 'mangadex.png';

        this.apiBase = 'https://api.mangadex.org';
        this.coverBase = 'https://uploads.mangadex.org/covers';
    }

    async search(query) {
        try {
            const url = `${this.apiBase}/manga?title=${encodeURIComponent(query)}&limit=8&includes[]=cover_art`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.data) {
                return [];
            }

            const results = await Promise.all(
                json.data.map(async m => {
                    const title = m.attributes.title.en || Object.values(m.attributes.title)[0] || 'Unknown';
                    const year = m.attributes.year || '?';

                    const coverName = m.relationships.find(r => r.type === 'cover_art')?.attributes?.fileName;
                    const poster = coverName ? `${this.coverBase}/${m.id}/${coverName}` : null;

                    let count = 0;
                    const aggUrl = `${this.apiBase}/manga/${m.id}/aggregate?translatedLanguage[]=en`;
                    try {
                        const aggRes = await fetch(aggUrl);
                        const aggJson = await aggRes.json();
                        const vols = aggJson.volumes || {};
                        Object.values(vols).forEach(v => {
                            count += Object.keys(v.chapters || {}).length;
                        });
                    } catch (e) {
                        logger.logWarning(`Failed to fetch aggregate for ${title}`, e);
                    }

                    return {
                        title,
                        amount: `${count} Chapter${count === 1 ? '' : 's'}`,
                        year,
                        poster,
                        session: m.id
                    };
                })
            );

            return results;
        } catch (e) {
            return [];
        }
    }

    async download(task) {
        let { session, title, year = '0000' } = task.data;
        let safeTitle = title.replace(/[\/:*?"<>|]/g, '');
        let rootDir = path.join(this.basePath, 'Comics', `${safeTitle} (${year})`);
        mkdirp.sync(rootDir);

        task.addMessage(`Fetching chapter list...`);
        let chapters = await this.fetchChapters(session);
        task.addMessage(`Found ${chapters.length} chapters.`);

        for (let [index, chap] of chapters.entries()) {
            let chapNum = chap.attributes.chapter || 'ONESHOT';
            await this.downloadChapter(chap, rootDir, safeTitle, year, task);
        }

        task.addMessage('Download complete');
        logger.logSuccess(`Completed download: ${title}`);
    }

    async fetchChapters(mangaId) {
        let offset = 0;
        let limit = 100;
        let chapters = [];

        while (true) {
            let res = await fetch(
                `${this.apiBase}/chapter?manga=${mangaId}&translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}`
            );
            let json = await res.json();
            if (!json.data || json.data.length === 0) break;

            chapters.push(...json.data);

            if (json.total !== undefined && chapters.length >= json.total) break;
            offset += limit;
        }

        return chapters;
    }

    async downloadChapter(chapter, destDir, title, year, task) {
        let chapNum = chapter.attributes.chapter || 'ONESHOT';
        task.addMessage(`Downloading chapter ${chapNum}...`);

        let serverUrl = `${this.apiBase}/at-home/server/${chapter.id}`;
        let serverRes = await fetch(serverUrl);
        let serverJson = await serverRes.json();
        let baseUrl = serverJson.baseUrl;
        let hash = serverJson.chapter.hash;
        let pages = serverJson.chapter.data;

        let zip = new JSZip();
        let comicInfo = `<?xml version="1.0"?>
                            <ComicInfo>
                                <Title>${title}</Title>
                                <Series>${title}</Series>
                                <Number>${chapNum}</Number>
                                <Year>${year}</Year>
                            </ComicInfo>`;
        zip.file('ComicInfo.xml', comicInfo);

        await Promise.all(
            pages.map((filename, idx) => (async () => {
                let imgUrl = `${baseUrl}/data/${hash}/${filename}`;
                let resp = await fetch(imgUrl);
                let buffer = await resp.arrayBuffer();
                let name = String(idx + 1).padStart(3, '0') + path.extname(filename);
                zip.file(name, Buffer.from(buffer));
            })())
        );

        let cbzName = `${title} #${chapNum} (${year}).cbz`;
        let content = await zip.generateAsync({ type: 'nodebuffer', streamFiles: true });
        let outPath = path.join(destDir, cbzName);
        fs.writeFileSync(outPath, content);

        task.addMessage(`Downloaded Chapter ${chapNum}`);
    }
}