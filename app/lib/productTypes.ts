import type { DealStatus } from "./productInsights";

export type ProductData = {
  title: string;
  currentPrice: number | null;
  lowestPrice: number | null;
  rating: number | null;
  image: string | null;
  url: string;
  marketplace: string;
  asin: string;
  currency: string;
  dealStatus: DealStatus;
  targetPrice?: number;
  databaseId?: string;
  isActive?: boolean;
  notificationSent?: boolean;
};
