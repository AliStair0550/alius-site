import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { maaHente } from "./robots";

describe("robots.txt", () => {
  test("DR's mønster: Claude er udelukket, så er vi det også", () => {
    const dr = "User-agent: GPTBot\nDisallow: /\nUser-agent: anthropic-ai\nDisallow: /\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n";
    const d = maaHente(dr, "/nyheder/service/feeds/penge");
    assert.equal(d.tilladt, false);
    if (!d.tilladt) assert.match(d.grund, /anthropic-ai/);
  });

  test("Berlingskes mønster: kun andre bots udelukket, stjernegruppen tillader feedet", () => {
    const b = "User-agent: GPTBot\nDisallow: /\nUser-agent: CCBot\nDisallow: /\nUser-agent: *\nDisallow: /preview/\n";
    assert.deepEqual(maaHente(b, "/content/rss"), { tilladt: true });
    assert.equal(maaHente(b, "/preview/x").tilladt, false);
  });

  test("flere User-agent-linjer i træk deler regler", () => {
    const t = "User-agent: OAI-SearchBot\nUser-agent: Claude-Web\nUser-agent: ClaudeBot\nDisallow: /\n";
    assert.equal(maaHente(t, "/rss").tilladt, false);
  });

  test("længste regel vinder, Allow vinder ved lige længde", () => {
    const t = "User-agent: *\nDisallow: /api/\nAllow: /api/rssfeed\n";
    assert.equal(maaHente(t, "/api/rssfeed?topic=Nyt").tilladt, true);
    assert.equal(maaHente(t, "/api/andet").tilladt, false);
  });

  test("tom robots.txt og tom Disallow tillader alt", () => {
    assert.equal(maaHente("", "/rss").tilladt, true);
    assert.equal(maaHente("User-agent: *\nDisallow:\n", "/rss").tilladt, true);
  });
});
