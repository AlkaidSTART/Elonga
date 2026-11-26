import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "elonga",
    database: {
      type: "mysql",
      configured: Boolean(process.env.DATABASE_URL || process.env.MYSQL_HOST),
    },
    timestamp: new Date().toISOString(),
  });
}
