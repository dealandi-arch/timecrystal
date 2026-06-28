import Link from 'next/link';
import StageEditor from '../../components/rpg/StageEditor';

export default function EditorPage() {
  return (
    <main className="container">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>Stage Editor</h1>
      <p>
        Edit a stage&apos;s tiles, enemies, crystal patrol path, and start position. Only the stage data can be
        changed here — the engine, abilities, and saved progress are untouched. &quot;Save changes&quot; keeps the
        edit in your browser. To make an edit permanent and part of the code, click &quot;Show level JSON&quot; and
        paste it into <code>components/rpg/data/levelN.json</code> for that stage.
      </p>
      <StageEditor />
    </main>
  );
}
