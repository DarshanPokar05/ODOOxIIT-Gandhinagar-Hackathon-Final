const { pool } = require('../backend/config/database');
(async () => {
  try {
    const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs' ORDER BY ordinal_position");
    console.log(r.rows.map(x => x.column_name));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
