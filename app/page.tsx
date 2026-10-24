import { CalculatorBehavior } from "./calculator-behavior";
import homepage from "./content/homepage.json";

const html = homepage.html
  .replaceAll('href="index.html"', 'href="/"')
  .replaceAll('href="delete-guide.html"', 'href="/delete-guide"')
  .replaceAll('href="delete-account.html"', 'href="/delete-account"');

export default function HomePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CalculatorBehavior />
    </>
  );
}
