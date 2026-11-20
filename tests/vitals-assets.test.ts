import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf-8');

describe('Live vitals assets', () => {
  it('serves Cloudflare Pages security headers for all routes', () => {
    const headers = read('public/_headers');

    expect(headers).toMatch(/^\/\*/m);
    expect(headers).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin');
  });

  it('publishes a valid XML sitemap with the canonical URL', () => {
    const sitemap = read('public/sitemap.xml');

    expect(sitemap.trimStart().startsWith('<?xml')).toBe(true);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('<loc>https://hardwarefit.othrys.be/</loc>');
    expect(sitemap.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('publishes robots.txt that allows crawling and references the sitemap', () => {
    const robots = read('public/robots.txt');

    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://hardwarefit.othrys.be/sitemap.xml');
  });

  it('publishes a local 1200x630 SVG social card', () => {
    const image = read('public/og-image.svg');

    expect(image).toContain('<svg');
    expect(image).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(image).toContain('width="1200"');
    expect(image).toContain('height="630"');
    expect(image).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it('exposes complete social metadata in index.html', () => {
    const html = read('index.html');

    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:type"');
    expect(html).toContain('property="og:url"');
    expect(html).toContain('property="og:image" content="https://hardwarefit.othrys.be/og-image.svg"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image" content="https://hardwarefit.othrys.be/og-image.svg"');
  });

  it('keeps WebApplication JSON-LD and adds a truthful FAQPage block', () => {
    const html = read('index.html');
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];

    const schemas = blocks.map((block) => JSON.parse(block[1]));
    expect(schemas.some((schema) => schema['@type'] === 'WebApplication')).toBe(true);

    const faq = schemas.find((schema) => schema['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
    expect(faq['@context']).toBe('https://schema.org');
    expect(faq.mainEntity).toHaveLength(3);
    expect(faq.mainEntity.every((item: { '@type': string }) => item['@type'] === 'Question')).toBe(true);
    expect(faq.mainEntity.every((item: { acceptedAnswer: { '@type': string } }) => item.acceptedAnswer['@type'] === 'Answer')).toBe(true);

    expect(html).not.toMatch(/"@type"\s*:\s*"Person"/);
    expect(html).not.toMatch(/Zero Ads|Never Ads|Ad-Free/i);
  });
});
