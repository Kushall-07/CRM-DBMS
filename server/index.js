import express from 'express';
import cors from 'cors';
import { prisma } from './db.js';

const app = express();

/* ------------ middleware ------------ */
app.use(cors());                // allows DELETE by default
app.use(express.json());

// tiny logger so you can see requests hit the server
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/* ------------ root ------------ */
app.get('/', (_req, res) => res.status(404).json({ error: 'Not found' }));

/* ------------ ACCOUNTS ------------ */
app.get('/accounts', async (_req, res) => {
  const rows = await prisma.account.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

app.post('/accounts', async (req, res) => {
  try {
    const { name, industry, website } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const row = await prisma.account.create({ data: { name, industry, website } });
    res.status(201).json(row);
  } catch (e) {
    console.error('Create account error:', e);
    res.status(400).json({ error: 'Failed to create account' });
  }
});

app.put('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, industry, website } = req.body || {};
    const updated = await prisma.account.update({
      where: { id }, // if your id is Int: { id: Number(id) }
      data: {
        name,
        industry: industry ?? null,
        website: website ?? null,
      },
    });
    res.json(updated);
  } catch (e) {
    console.error('Update account error:', e);
    res.status(400).json({ error: 'Failed to update account' });
  }
});

// FK-safe delete (remove related opps first)
app.delete('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.opportunity.deleteMany({ where: { accountId: id } });
    await prisma.account.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete account error:', e);
    if (String(e.message || '').toLowerCase().includes('foreign key')) {
      return res.status(409).json({
        error:
          'Cannot delete account because related records exist. Delete opportunities first or enable cascade.',
      });
    }
    res.status(400).json({ error: 'Failed to delete account' });
  }
});

/* ------------ LEADS ------------ */
app.get('/leads', async (_req, res) => {
  const rows = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

app.post('/leads', async (req, res) => {
  try {
    const { fullName, company, email } = req.body ?? {};
    if (!fullName) return res.status(400).json({ error: 'fullName is required' });
    const row = await prisma.lead.create({ data: { fullName, company, email } });
    res.status(201).json(row);
  } catch (e) {
    console.error('Create lead error:', e);
    res.status(400).json({ error: 'Failed to create lead' });
  }
});

app.post('/leads/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.update({
      where: { id },
      data: { status: 'QUALIFIED' },
    });
    const account = await prisma.account.create({
      data: { name: lead.company || lead.fullName },
    });
    const opp = await prisma.opportunity.create({
      data: { name: `New deal - ${lead.fullName}`, accountId: account.id, stage: 'PROSPECTING' },
    });
    res.json({ account, opp });
  } catch (e) {
    console.error('Convert lead error:', e);
    res.status(400).json({ error: 'Failed to convert lead' });
  }
});

// ✅ THIS is the route the browser is calling
app.delete('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.lead.delete({ where: { id } }); // if Int: { id: Number(id) }
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete lead error:', e);
    res.status(400).json({ error: 'Failed to delete lead' });
  }
});

/* ------------ OPPORTUNITIES ------------ */
app.get('/opps', async (_req, res) => {
  const rows = await prisma.opportunity.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

app.post('/opps', async (req, res) => {
  try {
    const { accountId, name, amount } = req.body ?? {};
    if (!accountId || !name) {
      return res.status(400).json({ error: 'accountId and name are required' });
    }
    const row = await prisma.opportunity.create({
      data: { accountId, name, amount: amount ? Number(amount) : null },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error('Create opp error:', e);
    res.status(400).json({ error: 'Failed to create opportunity' });
  }
});

/* ------------ start server (ALWAYS LAST) ------------ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ CRM API running at http://localhost:${PORT}`);
});
