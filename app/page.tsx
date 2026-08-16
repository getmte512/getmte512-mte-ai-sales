import { ContactImporter } from "@/components/contact-importer";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return (
    <main>
      <header className="topbar">
        <div>
          <span className="eyebrow">MORE THAN ENERGY</span>
          <h1>Retail Contact CRM</h1>
        </div>
        <div className="scope-pill">Milestone 2 · Research &amp; prioritization</div>
      </header>
      <ContactImporter />
    </main>
  );
}
