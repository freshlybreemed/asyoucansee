import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mailgunConfigured, sendEmail } from "@/lib/mailgun";

describe("sendEmail", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("MAILGUN_API_KEY", "key-test");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.com");
    vi.stubEnv("NOTIFY_FROM_EMAIL", "rentals@example.com");
    vi.stubEnv("MAILGUN_API_BASE", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it("posts a form to the domain's messages endpoint with basic auth", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "<abc@mg>" }), { status: 200 }));
    delete process.env.MAILGUN_API_BASE;

    const result = await sendEmail({ to: ["a@x.com", "b@x.com"], subject: "Hi", text: "Body", replyTo: "r@x.com" });

    expect(result.id).toBe("<abc@mg>");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mailgun.net/v3/mg.example.com/messages");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("api:key-test").toString("base64")}`);
    const form = init.body as URLSearchParams;
    expect(form.getAll("to")).toEqual(["a@x.com", "b@x.com"]);
    expect(form.get("from")).toBe("rentals@example.com");
    expect(form.get("h:Reply-To")).toBe("r@x.com");
    expect(form.has("html")).toBe(false);
  });

  it("uses the EU base when configured", async () => {
    vi.stubEnv("MAILGUN_API_BASE", "https://api.eu.mailgun.net/");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }));
    await sendEmail({ to: "a@x.com", subject: "Hi", text: "Body" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.eu.mailgun.net/v3/mg.example.com/messages");
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get("h:Reply-To")).toBe("contact@asyoucansee.com");
  });

  it("throws with Mailgun's error on a non-2xx response", async () => {
    fetchMock.mockResolvedValue(new Response("Forbidden", { status: 401 }));
    await expect(sendEmail({ to: "a@x.com", subject: "Hi", text: "Body" })).rejects.toThrow("Mailgun 401: Forbidden");
  });

  it("reports configuration", () => {
    expect(mailgunConfigured()).toBe(true);
    vi.stubEnv("MAILGUN_DOMAIN", "");
    expect(mailgunConfigured()).toBe(false);
  });
});
