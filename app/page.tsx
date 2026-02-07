import Link from "next/link";

export default function Home() {
  return (
    <div className="grid gap-10">
      <header className="grid gap-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea">
          AO Match
        </p>
        <h1 className="text-4xl font-display font-semibold text-ink md:text-5xl">
          AO入試の情報格差をゼロにする、
          <span className="text-accent">高校生×大学生</span>のマッチング。
        </h1>
        <p className="max-w-2xl text-lg text-sea/80">
          依頼→受注→Stripeエスクロー→完了を一連で見せるプレゼン用MVPを用意しました。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/demo" className="btn btn-primary">デモを開く</Link>
          <Link href="/requests" className="btn btn-secondary">既存画面へ</Link>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          { title: "高校生", desc: "先輩の実績・評価を見て依頼。支払いはエスクローで安心。" },
          { title: "大学生", desc: "得意分野で受注。評価が蓄積され信頼が可視化。" },
          { title: "運営", desc: "審査・通報・手数料を集中管理。" }
        ].map((item) => (
          <div key={item.title} className="card p-6">
            <h3 className="text-xl font-semibold text-sea">{item.title}</h3>
            <p className="mt-3 text-sm text-sea/80">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
