export const SMOKE_SOURCE_PREFIX = "codex-smoke:";
export const SMOKE_EMAIL_PREFIX = "codex.smoke+";

export const SMOKE_TABLES = {
  contacts: {
    label: "Contact messages",
    marker: "source",
    where: "COALESCE(source, '') LIKE 'codex-smoke:%' OR COALESCE(email, '') LIKE 'codex.smoke+%@example.com'",
    nonSmokeWhere: "COALESCE(source, '') NOT LIKE 'codex-smoke:%' AND COALESCE(email, '') NOT LIKE 'codex.smoke+%@example.com'",
  },
  subscribers: {
    label: "Subscribers",
    marker: "source",
    where: "COALESCE(source, '') LIKE 'codex-smoke:%' OR COALESCE(email, '') LIKE 'codex.smoke+%@example.com'",
    nonSmokeWhere: "COALESCE(source, '') NOT LIKE 'codex-smoke:%' AND COALESCE(email, '') NOT LIKE 'codex.smoke+%@example.com'",
  },
  leads: {
    label: "Leads",
    marker: "source",
    where: "COALESCE(source, '') LIKE 'codex-smoke:%' OR COALESCE(email, '') LIKE 'codex.smoke+%@example.com'",
    nonSmokeWhere: "COALESCE(source, '') NOT LIKE 'codex-smoke:%' AND COALESCE(email, '') NOT LIKE 'codex.smoke+%@example.com'",
  },
  members: {
    label: "Members",
    marker: "interests",
    where: "COALESCE(interests, '') LIKE '%codex-smoke:%' OR COALESCE(email, '') LIKE 'codex.smoke+%@example.com'",
    nonSmokeWhere: "COALESCE(interests, '') NOT LIKE '%codex-smoke:%' AND COALESCE(email, '') NOT LIKE 'codex.smoke+%@example.com'",
  },
};

export function smokeTableDefinition(table) {
  const definition = SMOKE_TABLES[table];
  if (!definition) {
    throw new Error(`Unsupported smoke table: ${table}`);
  }
  return definition;
}

export function smokeWhere(table) {
  return smokeTableDefinition(table).where;
}

export function nonSmokeWhere(table) {
  return smokeTableDefinition(table).nonSmokeWhere;
}

export function smokeCountQuery(table) {
  return `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${smokeWhere(table)}`;
}

export function smokeDeleteQuery(table) {
  return `DELETE FROM ${table} WHERE ${smokeWhere(table)} RETURNING id`;
}
