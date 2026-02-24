import Link from "next/link";

const roles = [
  {
    key: "student",
    title: "高校生です",
    desc: "先輩メンターを探して依頼したい"
  },
  {
    key: "tutor",
    title: "大学生です",
    desc: "高校生の相談を受けてサポートしたい"
  }
] as const;

export default function AuthRolePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-sea">高校生ですか？大学生ですか？</h1>
        <p className="mt-2 text-sm text-sea/70">
          先に役割を選ぶと、登録/ログイン画面をそれぞれ表示します。
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <div key={role.key} className="rounded-2xl border border-sand bg-white p-5">
              <h2 className="text-lg font-semibold text-ink">{role.title}</h2>
              <p className="mt-2 text-sm text-sea/70">{role.desc}</p>
              <div className="mt-5 flex gap-2">
                <Link href={`/auth/register?role=${role.key}`} className="btn btn-primary">
                  新規登録
                </Link>
                <Link href={`/auth/login?role=${role.key}`} className="btn btn-secondary">
                  ログイン
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
