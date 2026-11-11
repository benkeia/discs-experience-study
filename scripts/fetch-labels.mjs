import fs from 'fs';
import path from 'path';

async function searchAndGetLabels(query) {
  try {
    const r = await fetch(`https://dvdcover.com/?s=${encodeURIComponent(query + ' label')}`);
    const t = await r.text();
    const links = [...t.matchAll(/<a href="([^"]+)" class="ms-thumb-link">/g)].map(x => x[1]);
    const results = [];
    for (const pageUrl of links.slice(0, 3)) {
      const pr = await fetch(pageUrl);
      const pt = await pr.text();
      const imgs = [...pt.matchAll(/https:\/\/dvdcover\.com\/wp-content\/uploads\/[0-9]{4}\/[0-9]{2}\/[^"'` ]+700x700\.jpg/g)].map(x => x[0]);
      if (imgs.length > 0) {
        results.push({ pageUrl, img: imgs[0] });
      }
    }
    return results;
  } catch (err) {
    console.error('Error fetching', query, err);
    return [];
  }
}

async function run() {
  const movies = ['matrix', 'interstellar', 'pulp fiction', 'blade runner', 'jurassic park', 'oppenheimer'];
  for (const m of movies) {
    const res = await searchAndGetLabels(m);
    console.log(m, res);
  }
}
run();
