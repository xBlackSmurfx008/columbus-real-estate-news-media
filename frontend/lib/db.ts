import { neon } from "@neondatabase/serverless";
import { generateArticleSlug } from '@/lib/article-routing';

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(databaseUrl);
}

// ============================================================
// SCHEMA INIT — Run once to create all tables
// ============================================================
export async function initSchema() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Admin',
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'draft',
      featured BOOLEAN NOT NULL DEFAULT false,
      category TEXT NOT NULL,
      category_class TEXT NOT NULL DEFAULT 'card-img-market',
      icon TEXT NOT NULL DEFAULT '$',
      title TEXT NOT NULL,
      canonical_slug TEXT,
      excerpt TEXT,
      body TEXT,
      author TEXT NOT NULL,
      date TEXT NOT NULL,
      read_time TEXT DEFAULT '5 min read',
      area_slug TEXT,
      topic_slug TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS article_slug_redirects (
      slug TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      reason TEXT NOT NULL DEFAULT 'headline-change',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS articles_canonical_slug_unique
    ON articles (canonical_slug)
    WHERE canonical_slug IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'display',
      status TEXT NOT NULL DEFAULT 'draft',
      placement TEXT NOT NULL,
      size TEXT,
      image_url TEXT,
      link_url TEXT,
      html_content TEXT,
      alt_text TEXT,
      title TEXT,
      text TEXT,
      cta_text TEXT,
      cta_url TEXT,
      brand_name TEXT,
      brand_color TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS market_snapshot (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      change TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'up',
      sort_order INT NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS market_sources (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      methodology_url TEXT,
      source_type TEXT NOT NULL,
      update_cadence TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS market_observations (
      id BIGSERIAL PRIMARY KEY,
      metric_key TEXT NOT NULL,
      label TEXT NOT NULL,
      value_display TEXT NOT NULL,
      value_numeric NUMERIC,
      unit TEXT,
      geography_type TEXT NOT NULL,
      geography_slug TEXT NOT NULL,
      geography_label TEXT NOT NULL,
      property_type TEXT NOT NULL DEFAULT 'all-residential',
      period_start DATE,
      period_end DATE NOT NULL,
      as_of_date DATE NOT NULL,
      source_slug TEXT NOT NULL REFERENCES market_sources(slug),
      source_url TEXT NOT NULL,
      methodology_url TEXT,
      notes TEXT,
      quality_status TEXT NOT NULL DEFAULT 'verified',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS hero_stats (
      id SERIAL PRIMARY KEY,
      value TEXT NOT NULL,
      label TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS neighborhoods (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      median TEXT NOT NULL,
      yoy TEXT NOT NULL,
      rent TEXT NOT NULL,
      dom TEXT NOT NULL,
      inventory TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ticker_items (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      sort_order INT NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      role TEXT NOT NULL,
      topic TEXT,
      status TEXT NOT NULL DEFAULT 'pitched',
      date TEXT NOT NULL DEFAULT 'TBD',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Matches the production columns exactly (verified 2026-07-08). The unique
  // index on email is added by scripts/migrate-lead-layer.mjs, not here —
  // the prod table predates it.
  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      area TEXT,
      topic TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      interests TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      stripe_customer_id TEXT,
      tier_started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Server-side traffic (no raw IP / UA stored; visitor_hash rotates daily).
  await sql`
    CREATE TABLE IF NOT EXISTS page_views (
      id BIGSERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      article_id TEXT,
      referrer_host TEXT,
      visitor_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS activation_events (
      id BIGSERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      path TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      visitor_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      initials TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      quote TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0
    )
  `;

  return { success: true };
}

// ============================================================
// SEED — Populate tables with initial production content
// ============================================================
export async function seedData() {
  const sql = getDb();

  // Check if already seeded
  const existing = await sql`SELECT COUNT(*) as count FROM articles`;
  if (Number(existing[0].count) > 0) {
    return { success: true, message: "Already seeded" };
  }

  // --- ARTICLES ---
  const articles = [
    {
      id: "a1", status: "live", featured: true, category: "Market Analysis",
      category_class: "card-img-market", icon: "$",
      title: "Columbus Inventory Climbs 14.2%: Is the Seller's Market Finally Over?",
      excerpt: "Active listings reached 4,440 in December — the highest level since 2019. Days on market rose to 43, up 19.4% year-over-year.",
      body: "For the first time since 2019, Columbus buyers have real options. Active residential listings hit 4,440 in December 2025 — a 14.2% year-over-year increase that signals a meaningful shift in market dynamics.\n\nThe data tells a nuanced story. While inventory is growing, months of supply remains at 1.8 — still well below the 5-6 months that defines a balanced market. Prices aren't falling; the median sale price rose to $322,000, up 5.9% year-over-year.\n\nIncome growth is the underappreciated factor. Columbus metro wages grew 7.2% year-over-year, now outpacing home price appreciation for the first time in this cycle.\n\nOur forecast: Columbus is transitioning from a seller's market to a competitive-balanced market. Not a buyer's market — inventory would need to triple for that. But a healthier, more sustainable market where both sides have negotiating room.",
      author: "Marcus Williams", date: "Mar 23, 2026", read_time: "12 min read",
      area_slug: "columbus-citywide", topic_slug: "market-trends"
    },
    {
      id: "a2", status: "live", featured: false, category: "Development",
      category_class: "card-img-development", icon: "\u25B2",
      title: "Franklinton's $365M Transformation: A Neighborhood-by-Neighborhood Guide",
      excerpt: "From the Peninsula Phase 2 to 50 new for-sale homes by New City, Franklinton is absorbing more investment than any Columbus neighborhood.",
      body: "Franklinton is absorbing more development capital than any single Columbus neighborhood since the Arena District transformation two decades ago.\n\nNew City Homes is delivering 50 new for-sale homes — the first significant for-sale housing in Franklinton's recent history. The 397 W. Broad Street project adds 235 rental units across a $75 million investment.\n\nCurrent Franklinton prices sit at a median of $285,000 — less than half of German Village across the river. With 6.2% year-over-year appreciation (the fastest in the metro), the arbitrage window is closing, but hasn't closed.",
      author: "Sarah Chen", date: "Mar 21, 2026", read_time: "15 min read",
      area_slug: "columbus-citywide", topic_slug: "development"
    },
    {
      id: "a3", status: "live", featured: false, category: "Neighborhoods",
      category_class: "card-img-neighborhood", icon: "\u25CF",
      title: "German Village at $635K: Inside Columbus's Most Expensive Zip Code",
      excerpt: "Median prices in German Village rose 4.8% to $635,000. The historic district is attracting a new wave of owner-investors.",
      body: "German Village's brick-lined streets and meticulously restored 19th-century homes have pushed median prices to $635,000 — 4.8% above last year and roughly double the Columbus metro average.\n\nWhat's driving the premium isn't just charm. German Village's walkability, proximity to downtown, and restaurant scene create a lifestyle proposition that commands prices typically reserved for suburban estate neighborhoods.",
      author: "David Park", date: "Mar 19, 2026", read_time: "9 min read",
      area_slug: "columbus-citywide", topic_slug: "market-trends"
    },
    {
      id: "a4", status: "live", featured: false, category: "Economic Impact",
      category_class: "card-img-policy", icon: "\u2605",
      title: "Intel's 5-Year Delay: What It Really Means for Licking County Land Values",
      excerpt: "Agricultural land that jumped to $50,000/acre after the 2022 announcement is now recalibrating. We analyzed 340 transactions.",
      body: "When Intel announced its Ohio semiconductor facility in 2022, agricultural land in Licking County jumped 10-15x in value. Then came the delay — pushing facility completion to 2030-2031.\n\nOur analysis of 340 land transactions since the delay announcement shows values declining approximately 50% from 2022-2023 peaks, though remaining well above pre-announcement levels.",
      author: "Rachel Torres", date: "Mar 17, 2026", read_time: "10 min read",
      area_slug: "columbus-citywide", topic_slug: "market-trends"
    },
    {
      id: "a5", status: "live", featured: false, category: "Rental Market",
      category_class: "card-img-analysis", icon: "%",
      title: "6,700 New Apartments Hit Columbus: Where Rents Are Falling — and Where They're Not",
      excerpt: "The largest supply wave in Columbus rental history is testing vacancy rates. Downtown and Franklinton are absorbing units.",
      body: "Columbus is experiencing its largest apartment supply wave in modern history. Over 6,700 new units were expected to deliver in 2025. The citywide average rent reached $1,341 in February 2026 — up just 2.24% year-over-year.\n\nUrban core properties are absorbing new supply with minimal concessions, maintaining occupancy above 94%. Meanwhile, some suburban corridors are offering up to two months free rent.",
      author: "Lisa Okafor", date: "Mar 15, 2026", read_time: "11 min read",
      area_slug: "columbus-citywide", topic_slug: "market-trends"
    },
    {
      id: "a6", status: "live", featured: false, category: "Commercial",
      category_class: "card-img-commercial", icon: "\u25A0",
      title: "Class A Office Absorbs 395K SF While B/C Bleeds: The Two-Market Reality",
      excerpt: "Columbus office vacancy holds at 21%, but the average masks a dramatic split. Premium suburban Class A is thriving.",
      body: "The Columbus office market is a tale of two cities. Class A suburban space absorbed 395,814 SF of positive absorption in 2025, running 314% ahead of Class B.\n\nAverage asking rent sits at $22.89/SF. The flight to quality is accelerating, and older Class B/C downtown stock faces mounting conversion pressure.",
      author: "James Mitchell", date: "Mar 13, 2026", read_time: "8 min read",
      area_slug: "columbus-citywide", topic_slug: "development"
    }
  ];

  for (const a of articles) {
    await sql`INSERT INTO articles (id,canonical_slug,status,featured,category,category_class,icon,title,excerpt,body,author,date,read_time,area_slug,topic_slug)
      VALUES (${a.id},${generateArticleSlug(a.title)},'draft',${a.featured},${a.category},${a.category_class},${a.icon},${a.title},${a.excerpt},${a.body},${a.author},${a.date},${a.read_time},${a.area_slug},${a.topic_slug})
      ON CONFLICT (id) DO NOTHING`;
  }

  // --- ADS ---
  const ads = [
    { id:"ad1",name:"Huntington Bank - First-Time Buyer",type:"native",status:"live",placement:"homepage-native",title:"Huntington Bank: First-Time Buyer Programs Designed for Columbus Families",text:"Expanding down payment assistance to qualified buyers in Franklin, Delaware, and Licking counties.",cta_text:"Learn About Programs",cta_url:"#",brand_name:"Huntington Bank",brand_color:"#006747" },
    { id:"ad2",name:"Park National - Commercial Lending",type:"native",status:"live",placement:"sidebar-native",title:"Park National Bank: Commercial Lending Made Local",text:"Competitive rates on commercial real estate loans with decision-making that stays in Columbus.",cta_text:"Get a Quote",cta_url:"#",brand_name:"Park National Bank",brand_color:"#1e3a5f" },
    { id:"ad3",name:"Leaderboard - Homepage",type:"display",status:"live",placement:"homepage-leaderboard",size:"728x90" },
    { id:"ad4",name:"Sidebar - Stories Top",type:"display",status:"live",placement:"stories-sidebar-top",size:"300x250" },
    { id:"ad5",name:"Sidebar - Stories Bottom",type:"display",status:"live",placement:"stories-sidebar-bottom",size:"300x600" }
  ];

  for (const a of ads) {
    await sql`INSERT INTO ads (id,name,type,status,placement,title,text,cta_text,cta_url,brand_name,brand_color,size)
      VALUES (${a.id},${a.name},${a.type},${a.status},${a.placement},${a.title||null},${a.text||null},${a.cta_text||null},${a.cta_url||null},${a.brand_name||null},${a.brand_color||null},${a.size||null})
      ON CONFLICT (id) DO NOTHING`;
  }

  // --- MARKET SNAPSHOT ---
  const snapshots = [
    {label:"Median Sale Price",value:"$322,000",change:"+5.9% YoY",direction:"up",sort_order:0},
    {label:"Active Listings",value:"4,440",change:"+14.2% YoY",direction:"up",sort_order:1},
    {label:"Avg Days on Market",value:"43 Days",change:"+19.4% YoY",direction:"up",sort_order:2},
    {label:"Avg Monthly Rent",value:"$1,341",change:"+2.24% YoY",direction:"up",sort_order:3},
    {label:"30-Yr Mortgage Rate",value:"6.4%",change:"from 6.8%",direction:"down",sort_order:4}
  ];
  for (const s of snapshots) {
    await sql`INSERT INTO market_snapshot (label,value,change,direction,sort_order) VALUES (${s.label},${s.value},${s.change},${s.direction},${s.sort_order})`;
  }

  // --- HERO STATS ---
  const heroStats = [
    {value:"$322K",label:"Median Home Price",sort_order:0},
    {value:"+5.9%",label:"YoY Price Change",sort_order:1},
    {value:"43",label:"Avg Days on Market",sort_order:2},
    {value:"$11.1B",label:"2025 Sales Volume",sort_order:3}
  ];
  for (const s of heroStats) {
    await sql`INSERT INTO hero_stats (value,label,sort_order) VALUES (${s.value},${s.label},${s.sort_order})`;
  }

  // --- NEIGHBORHOODS ---
  const neighborhoods = [
    {name:"German Village",median:"$635,000",yoy:"+4.8%",rent:"$1,620",dom:"28 days",inventory:"Low",sort_order:0},
    {name:"Dublin",median:"$615,000",yoy:"+3.6%",rent:"$1,540",dom:"32 days",inventory:"Low",sort_order:1},
    {name:"Grandview Heights",median:"$608,000",yoy:"+4.1%",rent:"$1,480",dom:"29 days",inventory:"Very Low",sort_order:2},
    {name:"Upper Arlington",median:"$602,000",yoy:"+3.3%",rent:"$1,420",dom:"31 days",inventory:"Low",sort_order:3},
    {name:"New Albany",median:"$573,000",yoy:"+4.0%",rent:"$1,380",dom:"35 days",inventory:"Moderate",sort_order:4},
    {name:"Bexley",median:"$548,000",yoy:"+3.9%",rent:"$1,350",dom:"30 days",inventory:"Low",sort_order:5},
    {name:"Short North",median:"$510,000",yoy:"+3.9%",rent:"$1,620",dom:"22 days",inventory:"Very Low",sort_order:6},
    {name:"Clintonville",median:"$430,000",yoy:"+3.4%",rent:"$1,350",dom:"26 days",inventory:"Low",sort_order:7},
    {name:"Westerville",median:"$420,000",yoy:"+3.8%",rent:"$1,310",dom:"38 days",inventory:"Moderate",sort_order:8},
    {name:"Worthington",median:"$415,000",yoy:"+2.9%",rent:"$1,290",dom:"36 days",inventory:"Moderate",sort_order:9},
    {name:"Hilliard",median:"$385,000",yoy:"+4.2%",rent:"$1,240",dom:"34 days",inventory:"Moderate",sort_order:10},
    {name:"Gahanna",median:"$368,000",yoy:"+3.7%",rent:"$1,220",dom:"37 days",inventory:"Moderate",sort_order:11},
    {name:"Franklinton",median:"$285,000",yoy:"+6.2%",rent:"$1,100",dom:"41 days",inventory:"Growing",sort_order:12},
    {name:"Columbus (city avg)",median:"$286,000",yoy:"+5.9%",rent:"$1,077",dom:"43 days",inventory:"Moderate",sort_order:13}
  ];
  for (const n of neighborhoods) {
    await sql`INSERT INTO neighborhoods (name,median,yoy,rent,dom,inventory,sort_order) VALUES (${n.name},${n.median},${n.yoy},${n.rent},${n.dom},${n.inventory},${n.sort_order})`;
  }

  // --- TICKER ---
  const tickers = [
    {text:"Columbus median home price hits $322,000 — up 5.9% year-over-year",active:true,sort_order:0},
    {text:"Merchant Building: 32-story, $430M mixed-use tower breaks ground downtown",active:true,sort_order:1},
    {text:"Intel Ohio delay pushes New Albany land values into recalibration",active:true,sort_order:2},
    {text:"Columbus metro adds 30,348 residents — outpacing Indianapolis, Cincinnati, Cleveland",active:true,sort_order:3},
    {text:"Office vacancy holds at 21% as Class A suburban absorbs 395,814 SF",active:true,sort_order:4},
    {text:"Average Columbus rent reaches $1,341/mo — up 2.24% YoY",active:true,sort_order:5}
  ];
  for (const t of tickers) {
    await sql`INSERT INTO ticker_items (text,active,sort_order) VALUES (${t.text},${t.active},${t.sort_order})`;
  }

  // --- INTERVIEWS ---
  const interviews = [
    {id:"i1",name:"Mic Gordon",initials:"MG",role:"Team Leader, Keller Williams Capital Partners",topic:"Columbus luxury market trends and buyer migration patterns.",status:"confirmed",date:"April 2",sort_order:0},
    {id:"i2",name:"Derrick Clay",initials:"DC",role:"CEO, Columbus Chamber of Commerce",topic:"Economic development pipeline and housing demand.",status:"confirmed",date:"April 8",sort_order:1},
    {id:"i3",name:"Jonas Peterson",initials:"JP",role:"Chief Economic Development Officer, Columbus Partnership",topic:"The $147 billion capital investment pipeline.",status:"scheduled",date:"April 14",sort_order:2},
    {id:"i4",name:"Norman Bertke",initials:"NB",role:"Managing Director, CBRE Columbus",topic:"Commercial real estate outlook — Class A vs. B/C split.",status:"scheduled",date:"April 18",sort_order:3},
    {id:"i5",name:"Mayor Andrew Ginther",initials:"AG",role:"Mayor, City of Columbus",topic:"Affordable housing initiatives and zoning reform.",status:"pitched",date:"TBD",sort_order:4},
    {id:"i6",name:"Dr. Robert Chambers",initials:"RC",role:"Director, Center for Real Estate, OSU Fisher College",topic:"Academic perspective on Columbus housing affordability.",status:"pitched",date:"TBD",sort_order:5}
  ];
  for (const i of interviews) {
    await sql`INSERT INTO interviews (id,name,initials,role,topic,status,date,sort_order) VALUES (${i.id},${i.name},${i.initials},${i.role},${i.topic},${i.status},${i.date},${i.sort_order})
      ON CONFLICT (id) DO NOTHING`;
  }

  // --- TESTIMONIALS ---
  const testimonials = [
    {initials:"KE",name:"Kyle Edwards",role:"Top Producer, Keller Williams Capital",quote:"The neighborhood pricing data alone saves me hours of CMA prep work every week.",sort_order:0},
    {initials:"AM",name:"Andrea Morrison",role:"Managing Partner, Crossroads Capital RE",quote:"I use the development pipeline data to identify acquisition targets before they hit the market.",sort_order:1},
    {initials:"JT",name:"James & Tanya Rodriguez",role:"First-Time Homebuyers, Clintonville",quote:"The neighborhood guides and pricing data gave us confidence we were making the right call.",sort_order:2}
  ];
  for (const t of testimonials) {
    await sql`INSERT INTO testimonials (initials,name,role,quote,sort_order) VALUES (${t.initials},${t.name},${t.role},${t.quote},${t.sort_order})`;
  }

  // --- DEFAULT SETTINGS ---
  const settings = [
    {key:"site_name",value:"Columbus Real Estate News"},
    {key:"tagline",value:"Central Ohio Market Intelligence"},
    {key:"contact_email",value:"editor@columbusrealestatenews.com"},
    {key:"contact_phone",value:"(614) 555-0182"},
    {key:"ads_email",value:"ads@columbusrealestatenews.com"},
    {key:"support_email",value:"support@columbusrealestatenews.com"}
  ];
  for (const s of settings) {
    await sql`INSERT INTO settings (key,value) VALUES (${s.key},${s.value}) ON CONFLICT (key) DO NOTHING`;
  }

  return { success: true, message: "Database seeded with production content" };
}
