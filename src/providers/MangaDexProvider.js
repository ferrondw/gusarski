import { Logger } from '../utils/Logger.js';
import Provider from '../Provider.js';
import JSZip from 'jszip';
import { mkdirp } from 'mkdirp';
import path from 'path';
import fs from 'fs';

export default class MangaDexProvider extends Provider {
    constructor() {
        super();
        this.name = 'Manga (MangaDex)';
        this.id = 'mangadex';
        this.icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAFZpJREFUeF7tXXl8VNW9/557Z2OyMsmEmUlCRRYVUYobslShqM+1xQp1aevztQqtVqxSrahPplqlKII7Avbp66J94q4IYrFggbiAglUhoAIJmQlDVrLNdu/v5UwSCGGSuXPnTpLJ3PtXPrm/7Xx/33vm7IdBf9IaAZbWpdcLD50AaU4CnQA6AdIcgTQvvl4D6ARIcwTSvPh6DaATIM0RSPPi6zWAToA0RyDNi6/XADoB0hyBNC++XgPoBEhzBNK8+HoNoBMgzRHo5eLTSy+Joc9ePUNsrJ8CJp/KJPkUMpheFh9bdV8vhxJxp9cAyUed0W9/ZkeodqosBS8VZPkSSOHBbegzICsXVFDsEW5/vDD5oRzrQSdAklCnl2aK+Ch0AQLN15Iknc9kKe+wK0EETp0ATLgIGD4Gsvfb28VR4xYlKZQezeoE0Bh1cl9mlWpphigF5iEUOuGoWpZ/8SNOAWbeBBSPbKsBfBUHsGHVCezHs+s1DkWROZ0AimCKLUTu6yxSne+nYjB4G6TwScdomCzA9OuBc34AGIxtr0mGXPLuE+Kki+fE9pAcCZ0AGuAamvujc8SWQ48ySRoLkHCMyezBwC/vA44fc9QrqquSpKfvPt949/J/ahCGKhM6AVTB1v4Bu6/Ol2vr7hMC/htAZIhqKisXuPFBYNixlQJteL2GlW4vZrPdzQmEkZCqTgCV8NEd06dRQ8MyJkvDuzVhNANzHgJGnhpVhJ6Yt0aY88eLVIagiZpOgDhhpGWzjPIOz82Cv/lBkGzuVp038KbfAPzH1dFF6qqA+69fyBa/cWecIWgqrhMgDjjJPTMTVYeWIRTgWe0Zu+NOBOY+CvBaINrz6QZIf1s8y7D4zRVxhKC5qE4AhZCS+xc2VJW/ilDw3Jgq/Ou/dTEw6rvdi676M/D+ykvY4rffiWkviQI6ARSAS7+bORQNNa9Ckk5XIA6cMK6NAD09f34I4d3bzzf+4YV/KLKZJCGdADGApXnX5qHe8w9I4R4+5y5G/usuYPz5PVt+ch7kfaV3CkOGP4nbFzUzgJKU4x7N6gToAZ5I8g95VyEcGq84OdZM4N7ngNz8nlUe+Q2weztIEJpgMLzPmPAKMpzvsAXPHVTsSwNBnQDdgEjumSaqqn+FhYKXxGzwdbbB+/t3PNU2zNvdU18NLLkNqCzrLEEQhCrZYHo1ZMl52PLw/32jQX5jmtAJEAUicrsFue6ThUJL029jIthVYMp04Kpboqv59gPrXgY2vQOEQ92bZiwEs+lZZGYsZA+8ui/uGOJQSCkC+Hy+TIPBYAsGgzlEZJNl2SiKIkmS5GeMVRsMhjq73V7NOIAJPOFbL7tGbG78S9Rh3Vh2L+d9/2uOlmqsB3irv2QN4I9j0I/XCGbrYiE3fwlzP++P5VrN+35JgD179ljMZnOBIAiTJUkaJwjCOCLiw2m2TtVx19h5I4oYYzLJ8l4mCNtkWd4qiuInLS0tnx533HENjDEpFkh0z5XDUX2wBLJsjyUb9f21dwAT2wf3ZBn44kPghSUAH/hR+ZDB+BHLzr6OLXhlp0oT3ar1GwLs3LkzKzc3dyoRXUhEUwCMAiBqVGCe/C2MsfcYY+8sXbr03263W+5qm6/WoQ3PrmbhYIwmfA9R/fxu4KzzgJYm4OWngc1rIrN+CT+CUCuZMueIg097gUWJXa39PiUAEbHq6uoTg8HgzQBmAOCLJo6dTVNbumh6hAAYdjDG/sQYe87hcDR1iEm3XnYja254KiFQfjK3bRxg2XygQuN2HENItmT8UXh01Xytuo0JlVVtXojI4PP5pobD4TmCIPAvPvpMmloHCvWIqJYxtpQxtsLx5JwQaqq3QJYdCtWji437HrB3J1CbvN6cbMlYIQy2z9GiXdDrBPD5fJPD4fD9ACYBaF8ZkRDkCSsTUV3Gtg17ct5cPi5hY71igMn+cec+Z5k9/wbGWEIDSL1GgLKyMpfBYOArX6/T8LddM7jF6krYl90JFgpqZjNphpiA6mvvQmjYyQ85HI55vOGr1levEMDj8fyUiBYyxlxqA026nhRG/op7YDxw1OBM0t2qcSBn5sB30yJgUGaIMXaRw+FYp8YO10kqAWpqanL8fv9TAHjHOKm+1ALQWS9z/cvI2vCqFqaSaqP51Mmov/zGDh/PulyuG9Q6TFpSvF7vyUT0ZwCnqQ2ut/XE+irYH78VTI45XNDboR3lr/q6exH8zokd/9tUWlo6ZerUqWE1QSWFAJWVldNkWX6pfeBGTVx9ppP7+lIM2v6vPvMfy3Fw6AngBOg011AJYLjL5YpjiPGIF80J4PF4LgfAv/zMWIXpj+8NB8qR/6d7wUKBfhceCSJqr56LwIijZqaJiE4qLCwsVROwpgTweDz8t/5PACxqgukXOkTIfud5ZGx5r1+E0zmIwKhxqLnyNoDvLOr0MMZ+63Q6H1ETsGYE8Hq9lxARr/atagLpTzpCcwPyl98FkU/b9vEjMwGMrxUxmlE16wGE85zRItrudDpPU9Md1IQABw4cmCRJ0ioAOX2Ml2buTXu/gu1vC8F6mrbVzNsRQ3xU598tDO9Vh/BVQxgNEmBkhMKhQ3HKRdMxedJEWCzHLDSVGWPTnE7n+nhDSpgANTU1Q/1+/8bWqr84Xuf9XT5j8ypk/+MFgBIabFNcTGIMt34dwruVjd26LLDb8cD98zFi+PFd7b7hdDqvUDLjedTPh+LooggSkbGysnI1EU1LxE6/1ZXlCAEySnpn4W7AYMbZm6oRCEs4NceEM3MMyBk7HrV5Rdi9+xts2fopmltacNOvZmHGj6Z3hS1IRJcWFhbG1XhJqAaoqKhYIAjC7/isXr9NYqKByTKy1v0dmSWreqUm+CpkRCgsYbSFED51Iup/MAtkMIKIcMB3EKWluzBxwngYjcdOozDGvjWZTOPy8vIOKS226sSVlZWdYzAY1gLofneM0ij6uxzJyPjoXWS9/1KvdA9JNKBp/IVo+P6PATHuidKVTU1NPxs5cqSifqwqAhCR2ev1bgKgbJ18f0+wwviMZaXIfXM5DNVehRrxi8lZuai79HoERo7reWFp96ZlRuwRZ6HzDiXeVRHA4/H8prXFv0SJg4Emw4J+ZH7wGqxb10GIZ31fDCDIaEbLmAloOO9qyNYs9bCFZVhW74Doa1iSXTD0d2z2GT2uj4ybAD6fzxEOh78C0HbOTZo+Yq0P1q3vw/rZP8HHDdQ+snkQ/KdMQtMZ5yNcUKT2qz/s3vB1FSzvRpYOSoLVdEnm3dPf7Sm2uAng9XoXEdFctQUeaHp8/YBl5yew7PgEpn07wAJ+MKn7j47/vvOvPVg8EoETTkfLyRNAFu3GzoxbymH+qG0lOZlEd878K36vGQHav/5/A4ix7WWgpVlZeVg4CF4z8DaCcKim7SdCCkeGbnmSpczcyEieZBsC2WhGY2MjauvqUV9/CC0tLZBkCUaDAVarFTk52cjJzkZGRgZYT5tMuoRm+LYaljU7IhvNmFF4Jss941eaEcDj8fC97AuUwaFLdUaAd+Oam5uxqeRDfPPtHjQ0NEa6chlWK8xmMwwGMdLVCwaDaGhsjJCiqqoaTU1NGDq0GKNGjsDpp43D8OOHQRR7WCwtybCsLQUnAozCimz3jFmaEGD37t1mq9X6TesCyj45zy6V6cS/7gqPN5LM4uIi2AYrbz5xUtTW1qKsbD92f/0N6urrYLPl4fhhx+GEUSNhtQ46FhqZIO6rgVDdcp/9B2fN14QAXq93BhGtTOVEDJTYQ6EQ6g8dQnVVNfLz82GzDY72M0GCIEx3OBxvJkwAPtJXWVn5EhHxtfv6oxECkiThUEMDfL6D2LN3H6qra9DU1Ai/P4BwOAwmCJGJn8yMTGRmWJGbm4vi4kLk2fKQlZUJg6H7QSLG2AGr1To6JyenJmECeL1ee2vyvwBQoFHZ09YMr9J3lu7Cps0l2LuvDIMsFtjtdgwpKIDdnh9p/PH/GU0miKIQ+bJJpgghAsEgWppbEAyHYDGb4XQ6YRuc210j8Q8ul+u/YwGtqBvI5/pbR/3eGtBj/rGQSvB9IBDAhx99gq927MSQIQUYf9aZcDqGRJIXTytfYRjbnE7neMZYzDXuighQUVHxMF91otC5LtYJAVmWUV6+H9U1NZEGoD0//h603++P/ObzngFvSPLJ6eysLOTn5UVqjC4E4vvRLnW5XIo2kioigNfr3UpEKbO6tz8xkBOAV/s9dt26EMbrrcTHW7Zi166vsb+iAnwNwIgRx8PldKKoqBBDCuyR33/ejexid6PFYvmJzWZTvLkhJgHKy8sHiaLIDzLuF9u4+lNytYqFt+p37NyFzSUfonTXrkhj75QxJ2Pcd8diaHGRIvIwxta37oC+tPNmVyXxxSSAx+OZDKD/rpNWUsp+KsMTv3rNWry37p+RgZ7JkyZg5IjhcY/+8XF/AONdLtfWeIsakwCVlZVzZFl+LF7Dunz3CPDEb9r8IVa/uzYyunfpxRdGhn8TeLa6XK4z1OjHJIDH4+HTvnz6V380QGDfvjK8tWo1Ro8+CRPPPgsWS8Ir6AN8f6DT6VR14nhMAni93heJ6CoNyp7WJnhD8LNtn2P//v245OILFf2uKwCsFsAcl8v1VwWyUUWUEGADEZ2j1kG7Hu+5lLUy9SMiKgdYcx+di5hgMdSpt56HIG7cXFKUlZmx7/TTEu9MRc5BIqowGo2r7Ha7R11UbVoxCeDxeHYAOLwTMV5njLHPAdzl8/nWjx079vBxLPHaSWX5ESNGmL8uKpKwfr2qDZzJLLsSAvA+pZo1/7xl+kQgEJg3bNiwpBxxlkxg0sW2EgKUAyiKF5DWo0vmOxyOB+LdqBCvH10+MQSSQgDG2NsOh2N6R/LpuikWmNgcQFbRVeGHhnU9ASXa/5QC0Z2u1ja1tsfLJwCMDkEIL2VLN8bd54+GUDII0CLL8sSioqJtHQ7phnN+DkFcoerkTaV5TS+5UlDDaWz5VlVnAnSGSnMCMMbWOZ3O8zo7oVlT5hLDopjO0iuJ6kvLmAfyodFs+daE7xqMmROPxxNXG4AxdrvT6TzqFkz65cQCkGkZCClyDJua3HAoe2ETKaMmgC1gy9ar7vsnuwb4frRRKZo5U0TRfpMaaHWdTgiEc2X2xGpF276U4KZ5DUBEpxcWFn6qxLku0/cIKCCAtxwgxd1AxthUNQcV9D0U6RlBTAJ4PZ5yim8c4DaXy3XUvkGadV4OEOK3KE2IG+YB0wuMo43QU0+V0NB6Kv7v2bIPNDm0ICYB4m0EAljjcrmOug2TZp97M8Aejzv5ukJ3CJQjFDqZ/c8m9ZsS2y0ngwDNjLEznU4n30AaeeiGc2+EwJ5UMveg51wRAnvRbBrD/rI24bkVJQTYC+A7isLqYBVjLzscjqsOjwTeOCUTYbjBqKMb2FYfRvPe9t+2/lTHe/6/yFFZ7VpH/u4I68j7zoEesXKsvQ7/kTd8aW77QUBHenJJjpEZIWNypGSxHqLPwVAdwYDQBIkeZc9+8H4sNSXvYzqvqKgoYYydrcRYJxl+atU8p9P50FH5cEPAl+0FPhl0+G8lxrk8fzr0ler0JB/NZue4EoiRb6Ga2VOMmd+zwSRWxF5rSTJkuhx1H/BT2ICVkLW6LKLzN9ZtqBUVFc8xxvgR73E97V//7x0Ox0OtZNCs3xpXEP1YmH4xwQaDmR/zGmOxLScA+yFbsf7tZBQnZg3g8XhubV2GHuMe1G5D47M4JaIo3l9QUMDv61F9rn0yCt+XNlOGAOXl5SNEUeTn0CZ6lw9vS/BDpfYp2bHSkRxZlpkgCEeNsUb7H5eXZTkgCMIBxthX4XDYW1hYyK+E6ZekSxkCcGC9Xi9fynVWX34xcfrmSeeX9vARyTcDgcDfhw0bVhenjaSKpxQBKioqrm+97WN5Cnfj6hhjS8xm82M2my3hGTQtmJFSBKitrc31+/1biGi4FoXvQxt722crX+7DGCKuuyFAAIjM9vELMtufPm4EdoTh9XqvI6Ln+hq4hPwT8RO9whlb3ns2s7T6FuZ2x9w9m5C/HpS7EIAA2ghGtwAGH4j4rWr/2baApp8QwO12C7NmzXoFwDGH1CYLJK3s8hO/TV9vR8bWdTDt+RJMChNM5tcwtOBadvtfEh5NUxPnEQLQXoDdhxr7i2zlysN31dCsKZPB6AGATYKM6X3WDexcOH5QBID1rfcCjFZT6L7QMVSWIWf18zCV7zrmClcymd9gY74zk81entBl02rKRTePz0bQchME6Rm2dCPf4HHME1lLacYPwaQ97Jl/fazGTyydmOMAXQ14vd7RRLRG5VLxWPFo954Ig77YjJy3VvR0FyDJZstCwXb23Vrex6tdIZJvKW4C8JAOHjw4KhQK8dtBxiY/RHUerB+vRfbav/LqvmcDfJTSknEhe/TtuC9bUBdZ/9JSRQBehPLycpvBYFhORD8EEPeR1smEwbLjYwxe+bjiW7vJYNy1z144dpj7+bTbwKKaADyB/Mwgr9fLbwm7B+gfCz753X95z94LsTG+cR/Zknmz+NjbfMo6rZ6ECNCBFD8+/sCBA+fLsvxrfncNEfGjLDWxHW82cl5/BtbtH8SrBojGL1FgOYu530p4rX38zvtOQ/Mk7d+/P08QhCmMsTGMsWIiyu16PTzfKp2Ek7HIUOsrzH9y7klMllTcWcgkZOdOYw+/tqHv0tH7njUnQO8X4YhHcrsN8G8rkpta7hCCgV/GXQuZLYvY42tu78sy9LbvAUWAzuCF51x8vRhofjr2fHsnAhlNXwhPrj2lt5PQl/4GLAHI7RbkqpKnhFCkJlD2CELY+91zclyz3WnTDhiwBOAZ98+7cpS51rcNRFGO1I7OiWCuc4x54YtfKmNM6ksNaALwtiZuvuBLhIInKU1VOGvwNOOi1zRZcKnUZ1/KDWgCcGDlX017jcmS4gksyea83LDgxdf7Mim96XvAE0D69QX/K4SC1yoFNWyzTzQuWFmiVD7V5QY8Aei2y2ajqeEZRYliQsP+UWOHFN+2pEWR/AAQGvAEqHz4ZxlDvvXuhhyOeu965xzKJsti8Yk1aXUj2oAnAE9w+DcXTRf9/hdB1O2xnGQQtzdarOdlP/JW1QD4sBUXIS0IECHBLZddIQSbn2ayxBe1HCk3Q5hE40aWM+Qa9uBfk3cnrOKU9K5g2hCAw0pzr86XAzUzQHQmBJYpEJXBaH4POQ3vM3f/O8SxN6iQVgToDUBTzYdOgFTLmMbx6gTQGNBUM6cTINUypnG8OgE0BjTVzOkESLWMaRyvTgCNAU01czoBUi1jGserE0BjQFPNnE6AVMuYxvHqBNAY0FQzpxMg1TKmcbw6ATQGNNXM6QRItYxpHK9OAI0BTTVzOgFSLWMax/v/lcGi6i50Ne4AAAAASUVORK5CYII=';
        this.defaultPosterType = 'book';
        this.category = 'Manga';
        this.searchPlaceholder = 'Search manga...';

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
                        Logger.warning(`Failed to fetch aggregate for ${title}`, e);
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
        try {
            let { session, title, year = '0000' } = task.data;
            let safeTitle = title.replace(/[\/:*?"<>|]/g, '');
            let rootDir = path.join(this.basePath, `${safeTitle} (${year})`);
            mkdirp.sync(rootDir);

            task.addMessage(`Fetching chapter list...`);
            let chapters = await this.fetchChapters(session);
            task.addMessage(`Found ${chapters.length} chapters.`);

            for (let chap of chapters) {
                await this.downloadChapter(chap, rootDir, safeTitle, year, task);
            }

            task.addMessage('Download complete');
            Logger.success(`Completed download: ${title}`);
        } catch (e) {
            task.addMessage(`Error: ${e.message}`);
            Logger.error('Download error', e);
            throw new Error('Download failed');
        }
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