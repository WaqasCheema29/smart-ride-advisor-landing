import guide from "../content/deletion-guide.json";

export const metadata = {
  title: "Terms & Account Deletion Guide — Smart Ride Advisor",
  description: "Review Smart Ride Advisor account deletion terms and instructions.",
};

const html = guide.html
  .replaceAll("index.html", "/")
  .replaceAll('href="delete-account.html"', 'href="/delete-account"');

export default function DeleteGuidePage() {
  return <div className="legacy-guide" dangerouslySetInnerHTML={{ __html: html }} />;
}
