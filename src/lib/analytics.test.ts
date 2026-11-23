import { describe, expect, it } from "vitest";
import { isBotUserAgent, isCompanyOrg, isDatacenterOrg } from "./analytics";

describe("bots en datacenters (HALO-herstelplan, november 2026)", () => {
  it("herkent een datacenter, cloud of hostingpartij aan de netwerknaam", () => {
    expect(isDatacenterOrg("CHINA UNICOM China169 Backbone")).toBe(true);
    expect(isDatacenterOrg("HUAWEI CLOUDS")).toBe(true);
    expect(isDatacenterOrg("Huawei Cloud Service data center")).toBe(true);
    expect(isDatacenterOrg("China Mobile Communications Group Co., Ltd.")).toBe(true);
    expect(isDatacenterOrg("Amazon.com, Inc.")).toBe(true);
    expect(isDatacenterOrg("Microsoft Corporation")).toBe(true);
    expect(isDatacenterOrg("Google LLC")).toBe(true);
    expect(isDatacenterOrg("OVH SAS")).toBe(true);
    expect(isDatacenterOrg("Zscaler Switzerland GmbH")).toBe(true);
  });

  it("laat een echte organisatie en een consumentenprovider met rust", () => {
    expect(isDatacenterOrg("Stichting Yulius")).toBe(false);
    expect(isDatacenterOrg("Gemeente Eindhoven")).toBe(false);
    expect(isDatacenterOrg("KPN B.V.")).toBe(false);
    expect(isDatacenterOrg(null)).toBe(false);
    // Een consumentenprovider is geen bedrijf, maar het bezoek telt wel.
    expect(isCompanyOrg("KPN B.V.")).toBe(false);
    expect(isCompanyOrg("Stichting Yulius")).toBe(true);
    expect(isCompanyOrg("HUAWEI CLOUDS")).toBe(false);
  });

  it("herkent crawlers, scrapers en meetprogramma's aan de user-agent", () => {
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (Linux; Android 10) HeadlessChrome/120.0")).toBe(true);
    expect(isBotUserAgent("python-requests/2.31.0")).toBe(true);
    expect(isBotUserAgent("curl/8.4.0")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)")).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent(null)).toBe(true);
  });

  it("laat een gewone browser door", () => {
    expect(isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")).toBe(false);
    expect(isBotUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15")).toBe(false);
  });
});
