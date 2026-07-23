import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { WIDGETS } from "../lib/widgets/registry";

const prisma = new PrismaClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me";
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", passwordHash },
  });
  console.log(`Admin user ready: ${email}`);

  if ((await prisma.widget.count()) > 0) {
    console.log("Widgets already exist — skipping demo content.");
    return;
  }

  const heroSlides = [
    {
      imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&q=80",
      heading: "Welcome to Palmerston Park",
      subheading: "Home of Queen of the South FC",
      buttonText: "Buy tickets",
      buttonUrl: "https://www.qosfc.com/tickets",
      textColor: "#ffffff",
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80",
      heading: "Season tickets 2026/27",
      subheading: "Early-bird prices available now",
      buttonText: "Find out more",
      buttonUrl: "#",
      textColor: "#ffffff",
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1600&q=80",
      heading: "Matchday hospitality",
      subheading: "Enjoy the game in style",
      buttonText: "Book now",
      buttonUrl: "#",
      textColor: "#ffffff",
    },
  ];
  const heroId = nanoid(12);
  await prisma.widget.create({
    data: {
      id: heroId,
      name: "Homepage hero",
      type: "HERO_SLIDER",
      status: "PUBLISHED",
      contentSource: "MANUAL",
      settings: WIDGETS.HERO_SLIDER.defaultSettings as any,
      createdById: user.id,
      publishedAt: new Date(),
      published: {
        settings: WIDGETS.HERO_SLIDER.defaultSettings,
        contentSource: "MANUAL",
        dataSourceId: null,
        dataBinding: null,
        items: heroSlides,
      } as any,
      items: { create: heroSlides.map((data, i) => ({ sortOrder: i, data: data as any })) },
    },
  });
  console.log(`Created demo Hero Slider: ${heroId}`);

  const newsItems = [
    {
      title: "Queens seal dramatic late win",
      date: "2026-07-20",
      imageUrl: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&q=80",
      excerpt: "A stoppage-time strike sealed all three points at Palmerston.",
      url: "#",
      category: "Match Report",
    },
    {
      title: "Guthrie signs contract extension",
      date: "2026-07-18",
      imageUrl: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=800&q=80",
      excerpt: "The striker commits his future to the club for another season.",
      url: "#",
      category: "Club News",
    },
    {
      title: "Season tickets now on sale",
      date: "2026-07-15",
      imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80",
      excerpt: "Secure your seat with early-bird pricing available until August.",
      url: "#",
      category: "Tickets",
    },
  ];
  const newsId = nanoid(12);
  await prisma.widget.create({
    data: {
      id: newsId,
      name: "Latest news",
      type: "LATEST_NEWS",
      status: "PUBLISHED",
      contentSource: "MANUAL",
      settings: WIDGETS.LATEST_NEWS.defaultSettings as any,
      createdById: user.id,
      publishedAt: new Date(),
      published: {
        settings: WIDGETS.LATEST_NEWS.defaultSettings,
        contentSource: "MANUAL",
        dataSourceId: null,
        dataBinding: null,
        items: newsItems,
      } as any,
      items: { create: newsItems.map((data, i) => ({ sortOrder: i, data: data as any })) },
    },
  });
  console.log(`Created demo Latest News: ${newsId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
