import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Task, TaskDate, TaskStatus } from '../types/task';

// ─── DB row shape ─────────────────────────────────────────────────────────────
type DBRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: number;
  task_date: string | null;
  sort_order: number;
};

function rowToTask(row: DBRow): Task {
  return {
    id: row.id,
    title: row.title,
    ...(row.description ? { description: row.description } : {}),
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    taskDate: row.task_date ? JSON.parse(row.task_date) : undefined,
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function dayTs(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime();
}

// ─── seed data ────────────────────────────────────────────────────────────────
async function seedTasks(db: ReturnType<typeof useSQLiteContext>) {
  const y = new Date().getFullYear();

  type Seed = {
    title: string;
    description?: string;
    status: TaskStatus;
    createdAt: number;
    taskDate?: TaskDate;
  };

  const seeds: Seed[] = [
    // ── January ───────────────────────────────────────────────────────────────
    { title: 'Set annual goals and write them down',       description: 'Cover health, career, finances and relationships.', status: 'completed', createdAt: dayTs(y, 0, 2),  taskDate: { type: 'single', start: dayTs(y, 0, 3)  } },
    { title: 'Renew gym membership',                       status: 'completed', createdAt: dayTs(y, 0, 3),  taskDate: { type: 'single', start: dayTs(y, 0, 5)  } },
    { title: 'Deep-clean the apartment',                   status: 'completed', createdAt: dayTs(y, 0, 5),  taskDate: { type: 'single', start: dayTs(y, 0, 7)  } },
    { title: 'File Q4 tax documents',                      description: 'Gather receipts, invoices and bank statements.', status: 'completed', createdAt: dayTs(y, 0, 8),  taskDate: { type: 'range',  start: dayTs(y, 0, 10), end: dayTs(y, 0, 14) } },
    { title: 'Update LinkedIn profile',                    status: 'completed', createdAt: dayTs(y, 0, 10), taskDate: { type: 'single', start: dayTs(y, 0, 12) } },
    { title: 'Book dentist appointment',                   status: 'completed', createdAt: dayTs(y, 0, 12), taskDate: { type: 'single', start: dayTs(y, 0, 20) } },
    { title: 'Read "Atomic Habits"',                       description: 'Take notes on key habits and apply one per week.', status: 'completed', createdAt: dayTs(y, 0, 14), taskDate: { type: 'range',  start: dayTs(y, 0, 15), end: dayTs(y, 0, 31) } },
    { title: 'Cancel unused streaming subscriptions',      status: 'completed', createdAt: dayTs(y, 0, 16) },
    { title: 'Plan February trip itinerary',               status: 'completed', createdAt: dayTs(y, 0, 18), taskDate: { type: 'single', start: dayTs(y, 0, 25) } },
    { title: 'Organise home office desk',                  status: 'completed', createdAt: dayTs(y, 0, 22) },

    // ── February ──────────────────────────────────────────────────────────────
    { title: 'Weekend trip to the mountains',              description: 'Pack warm layers, book accommodation in advance.', status: 'completed', createdAt: dayTs(y, 1, 1),  taskDate: { type: 'range',  start: dayTs(y, 1, 8),  end: dayTs(y, 1, 10) } },
    { title: 'Valentine\'s dinner reservation',           status: 'completed', createdAt: dayTs(y, 1, 5),  taskDate: { type: 'single', start: dayTs(y, 1, 14) } },
    { title: 'Complete online Python course',              status: 'completed', createdAt: dayTs(y, 1, 6),  taskDate: { type: 'range',  start: dayTs(y, 1, 6),  end: dayTs(y, 1, 28) } },
    { title: 'Schedule car service',                       status: 'completed', createdAt: dayTs(y, 1, 10), taskDate: { type: 'single', start: dayTs(y, 1, 18) } },
    { title: 'Review and update budget spreadsheet',       description: 'Check monthly expenses against targets.', status: 'completed', createdAt: dayTs(y, 1, 12) },
    { title: 'Blood test and annual health check',         status: 'completed', createdAt: dayTs(y, 1, 14), taskDate: { type: 'single', start: dayTs(y, 1, 22) } },
    { title: 'Fix leaking kitchen tap',                    status: 'completed', createdAt: dayTs(y, 1, 16) },
    { title: 'Migrate project to new repository',          status: 'completed', createdAt: dayTs(y, 1, 20), taskDate: { type: 'range',  start: dayTs(y, 1, 20), end: dayTs(y, 1, 25) } },

    // ── March ─────────────────────────────────────────────────────────────────
    { title: 'Spring wardrobe declutter',                  status: 'completed', createdAt: dayTs(y, 2, 1),  taskDate: { type: 'single', start: dayTs(y, 2, 8)  } },
    { title: 'Team offsite planning',                      description: 'Book venue, arrange transport and catering.', status: 'completed', createdAt: dayTs(y, 2, 3),  taskDate: { type: 'range',  start: dayTs(y, 2, 15), end: dayTs(y, 2, 17) } },
    { title: 'Set up automated savings transfer',          status: 'completed', createdAt: dayTs(y, 2, 5)  },
    { title: 'Start seedling trays for the garden',        status: 'completed', createdAt: dayTs(y, 2, 8),  taskDate: { type: 'single', start: dayTs(y, 2, 10) } },
    { title: 'Write Q1 performance review',                description: 'Summarise wins, misses and goals for next quarter.', status: 'completed', createdAt: dayTs(y, 2, 18), taskDate: { type: 'range',  start: dayTs(y, 2, 25), end: dayTs(y, 2, 31) } },
    { title: 'Research standing desk options',             status: 'archived',  createdAt: dayTs(y, 2, 20) },
    { title: 'Finish bathroom tile grout repair',          status: 'archived',  createdAt: dayTs(y, 2, 22), taskDate: { type: 'single', start: dayTs(y, 2, 29) } },

    // ── April ─────────────────────────────────────────────────────────────────
    { title: 'Book flights for summer holiday',            description: 'Check both direct and connecting options.', status: 'archived',  createdAt: dayTs(y, 3, 1),  taskDate: { type: 'single', start: dayTs(y, 3, 5)  } },
    { title: 'Plant vegetable garden',                     status: 'archived',  createdAt: dayTs(y, 3, 4),  taskDate: { type: 'range',  start: dayTs(y, 3, 12), end: dayTs(y, 3, 14) } },
    { title: 'Prepare conference talk slides',             description: 'Keep it to 20 slides, include live demo.', status: 'archived',  createdAt: dayTs(y, 3, 6),  taskDate: { type: 'range',  start: dayTs(y, 3, 18), end: dayTs(y, 3, 22) } },
    { title: 'Dog grooming appointment',                   status: 'archived',  createdAt: dayTs(y, 3, 9),  taskDate: { type: 'single', start: dayTs(y, 3, 15) } },
    { title: 'Rebalance investment portfolio',             status: 'archived',  createdAt: dayTs(y, 3, 14) },
    { title: 'Fix broken fence panel',                     status: 'archived',  createdAt: dayTs(y, 3, 18) },

    // ── May ───────────────────────────────────────────────────────────────────
    { title: 'Mom\'s birthday – organise family dinner',  description: 'Reserve table for 8 at her favourite restaurant.', status: 'archived',  createdAt: dayTs(y, 4, 3),  taskDate: { type: 'single', start: dayTs(y, 4, 12) } },
    { title: 'Sign up for 10 km run',                      status: 'archived',  createdAt: dayTs(y, 4, 5),  taskDate: { type: 'single', start: dayTs(y, 4, 8)  } },
    { title: 'Draft mid-year budget review',               status: 'archived',  createdAt: dayTs(y, 4, 10) },
    { title: 'Paint the living room',                      description: 'Buy primer, two coats of eggshell white.', status: 'archived',  createdAt: dayTs(y, 4, 14), taskDate: { type: 'range',  start: dayTs(y, 4, 24), end: dayTs(y, 4, 26) } },
    { title: 'Research MBA programmes',                    status: 'archived',  createdAt: dayTs(y, 4, 20) },

    // ── June ──────────────────────────────────────────────────────────────────
    { title: 'Summer holiday – Barcelona',                 description: 'Flight, hotel and day trips all booked.', status: 'archived',  createdAt: dayTs(y, 5, 1),  taskDate: { type: 'range',  start: dayTs(y, 5, 14), end: dayTs(y, 5, 21) } },
    { title: 'Mid-year performance review',                status: 'archived',  createdAt: dayTs(y, 5, 5),  taskDate: { type: 'range',  start: dayTs(y, 5, 25), end: dayTs(y, 5, 30) } },
    { title: 'Replace worn running shoes',                 status: 'archived',  createdAt: dayTs(y, 5, 10), taskDate: { type: 'single', start: dayTs(y, 5, 15) } },
    { title: 'Learn basic Spanish phrases',                description: 'Use Duolingo for 15 minutes a day before the trip.', status: 'archived',  createdAt: dayTs(y, 5, 12), taskDate: { type: 'range',  start: dayTs(y, 5, 1),  end: dayTs(y, 5, 14) } },
    { title: 'Set up garden irrigation timer',             status: 'archived',  createdAt: dayTs(y, 5, 18) },

    // ── July ──────────────────────────────────────────────────────────────────
    { title: 'Post-holiday expense report',                status: 'completed', createdAt: dayTs(y, 6, 2),  taskDate: { type: 'single', start: dayTs(y, 6, 5)  } },
    { title: 'Start couch-to-5K training plan',            description: 'Three sessions per week, increase by 10 % each week.', status: 'completed', createdAt: dayTs(y, 6, 5),  taskDate: { type: 'range',  start: dayTs(y, 6, 7),  end: dayTs(y, 6, 31) } },
    { title: 'Deep-clean fridge and pantry',               status: 'completed', createdAt: dayTs(y, 6, 10) },
    { title: 'Research new laptop options',                description: 'Compare MacBook Pro M4 vs Dell XPS 15.', status: 'completed', createdAt: dayTs(y, 6, 15) },
    { title: 'Mow lawn and trim hedges',                   status: 'completed', createdAt: dayTs(y, 6, 18), taskDate: { type: 'single', start: dayTs(y, 6, 20) } },
    { title: 'Book eye-test appointment',                  status: 'completed', createdAt: dayTs(y, 6, 22), taskDate: { type: 'single', start: dayTs(y, 6, 28) } },

    // ── August ────────────────────────────────────────────────────────────────
    { title: 'Order back-to-school supplies',              status: 'completed', createdAt: dayTs(y, 7, 3),  taskDate: { type: 'single', start: dayTs(y, 7, 10) } },
    { title: 'Complete AWS cloud practitioner course',     description: 'Finish all 8 modules and pass mock exam.', status: 'completed', createdAt: dayTs(y, 7, 5),  taskDate: { type: 'range',  start: dayTs(y, 7, 5),  end: dayTs(y, 7, 30) } },
    { title: 'Service air conditioning unit',              status: 'completed', createdAt: dayTs(y, 7, 12), taskDate: { type: 'single', start: dayTs(y, 7, 18) } },
    { title: 'Update emergency contact list',              status: 'completed', createdAt: dayTs(y, 7, 20) },
    { title: 'Plan autumn holiday destinations',           status: 'completed', createdAt: dayTs(y, 7, 25) },

    // ── September ─────────────────────────────────────────────────────────────
    { title: 'Q3 review and Q4 planning session',          description: 'Review OKRs, set new targets with the team.', status: 'completed', createdAt: dayTs(y, 8, 2),  taskDate: { type: 'range',  start: dayTs(y, 8, 25), end: dayTs(y, 8, 30) } },
    { title: 'Register for half-marathon',                 status: 'completed', createdAt: dayTs(y, 8, 5),  taskDate: { type: 'single', start: dayTs(y, 8, 8)  } },
    { title: 'Check home insurance renewal date',          status: 'completed', createdAt: dayTs(y, 8, 10) },
    { title: 'Clear out garage',                           description: 'Sell or donate items not used in over a year.', status: 'completed', createdAt: dayTs(y, 8, 15), taskDate: { type: 'range',  start: dayTs(y, 8, 20), end: dayTs(y, 8, 22) } },
    { title: 'Flu vaccination',                            status: 'completed', createdAt: dayTs(y, 8, 20), taskDate: { type: 'single', start: dayTs(y, 8, 27) } },

    // ── October ───────────────────────────────────────────────────────────────
    { title: 'Halloween party planning',                   description: 'Venue, decorations, costumes and food sorted.', status: 'completed', createdAt: dayTs(y, 9, 4),  taskDate: { type: 'range',  start: dayTs(y, 9, 25), end: dayTs(y, 9, 31) } },
    { title: 'Start Christmas gift list',                  status: 'completed', createdAt: dayTs(y, 9, 10) },
    { title: 'Prepare home for winter – insulation check', status: 'completed', createdAt: dayTs(y, 9, 14), taskDate: { type: 'single', start: dayTs(y, 9, 20) } },
    { title: 'Renew professional certifications',          description: 'Check expiry and submit renewal forms online.', status: 'completed', createdAt: dayTs(y, 9, 18), taskDate: { type: 'range',  start: dayTs(y, 9, 15), end: dayTs(y, 9, 30) } },
    { title: 'Buy winter tyres for car',                   status: 'completed', createdAt: dayTs(y, 9, 22), taskDate: { type: 'single', start: dayTs(y, 9, 28) } },

    // ── November (mix of active and recent completed) ─────────────────────────
    { title: 'Black Friday shopping list',                 description: 'Laptop, headphones, and kitchen gadgets.', status: 'completed', createdAt: dayTs(y, 10, 1), taskDate: { type: 'single', start: dayTs(y, 10, 29) } },
    { title: 'Book Christmas flights home',                status: 'completed', createdAt: dayTs(y, 10, 5), taskDate: { type: 'single', start: dayTs(y, 10, 8)  } },
    { title: 'Write year-end team retrospective',          description: 'Highlight wins, blockers and carry-overs into next year.', status: 'completed', createdAt: dayTs(y, 10, 10), taskDate: { type: 'range', start: dayTs(y, 10, 25), end: dayTs(y, 10, 30) } },
    { title: 'Order custom Christmas cards',               status: 'completed', createdAt: dayTs(y, 10, 14), taskDate: { type: 'single', start: dayTs(y, 10, 18) } },
    { title: 'Service boiler before winter',               status: 'completed', createdAt: dayTs(y, 10, 18), taskDate: { type: 'single', start: dayTs(y, 10, 22) } },

    // ── December / near-future active tasks ───────────────────────────────────
    { title: 'Buy Christmas gifts for family',             description: 'Check wish lists and stick to the budget.', status: 'active', createdAt: dayTs(y, 11, 1), taskDate: { type: 'range',  start: dayTs(y, 11, 1),  end: dayTs(y, 11, 20) } },
    { title: 'Write Christmas cards and post them',        status: 'active', createdAt: dayTs(y, 11, 3), taskDate: { type: 'single', start: dayTs(y, 11, 15) } },
    { title: 'Prepare annual salary review notes',         description: 'List achievements, market rate research and target figure.', status: 'active', createdAt: dayTs(y, 11, 5), taskDate: { type: 'single', start: dayTs(y, 11, 10) } },
    { title: 'New Year\'s Eve dinner – find a venue',      status: 'active', createdAt: dayTs(y, 11, 6), taskDate: { type: 'single', start: dayTs(y, 11, 18) } },
    { title: 'Back up all devices before end of year',     status: 'active', createdAt: dayTs(y, 11, 7) },
    { title: 'Order New Year gifts for close friends',     status: 'active', createdAt: dayTs(y, 11, 8), taskDate: { type: 'single', start: dayTs(y, 11, 22) } },
    { title: 'Review subscriptions – cancel unused ones',  status: 'active', createdAt: dayTs(y, 11, 9) },
    { title: 'Plan January detox meal prep',               description: 'Batch-cook soups and salads for the first week.', status: 'active', createdAt: dayTs(y, 11, 10), taskDate: { type: 'range',  start: dayTs(y, 11, 28), end: dayTs(y, 11, 31) } },
    { title: 'Set up 2025 goal-tracking spreadsheet',      status: 'active', createdAt: dayTs(y, 11, 11) },
    { title: 'Send holiday out-of-office auto-reply',      status: 'active', createdAt: dayTs(y, 11, 12), taskDate: { type: 'single', start: dayTs(y, 11, 20) } },

    // ── Next year active tasks ─────────────────────────────────────────────────
    { title: 'January: join a new fitness class',          description: 'Yoga, pilates or HIIT – try all three before committing.', status: 'active', createdAt: dayTs(y, 11, 13), taskDate: { type: 'range',  start: dayTs(y + 1, 0, 6),  end: dayTs(y + 1, 0, 10) } },
    { title: 'Renew passport',                             status: 'active', createdAt: dayTs(y, 11, 14), taskDate: { type: 'single', start: dayTs(y + 1, 0, 15) } },
    { title: 'Research new project management tools',      description: 'Compare Linear, Notion and Jira for the team.', status: 'active', createdAt: dayTs(y, 11, 15) },
    { title: 'Schedule Q1 team kick-off meeting',          status: 'active', createdAt: dayTs(y, 11, 16), taskDate: { type: 'single', start: dayTs(y + 1, 0, 8)  } },
    { title: 'Book ski trip for February',                 description: 'Aim for at least 5 days on the slopes.', status: 'active', createdAt: dayTs(y, 11, 17), taskDate: { type: 'range',  start: dayTs(y + 1, 1, 14), end: dayTs(y + 1, 1, 21) } },
    { title: 'Update will and legal documents',            status: 'active', createdAt: dayTs(y, 11, 18), taskDate: { type: 'single', start: dayTs(y + 1, 0, 20) } },
    { title: 'Enrol in public speaking workshop',          description: 'Toastmasters or similar – one session per week.', status: 'active', createdAt: dayTs(y, 11, 19), taskDate: { type: 'range',  start: dayTs(y + 1, 0, 13), end: dayTs(y + 1, 2, 28) } },
    { title: 'Plan spring garden layout',                  status: 'active', createdAt: dayTs(y, 11, 20), taskDate: { type: 'single', start: dayTs(y + 1, 2, 1)  } },
    { title: 'Apply for conference speaker slot',          description: 'Submit abstract by the January deadline.', status: 'active', createdAt: dayTs(y, 11, 21), taskDate: { type: 'single', start: dayTs(y + 1, 0, 31) } },
    { title: 'Start reading list for next year',           status: 'active', createdAt: dayTs(y, 11, 22) },
    { title: 'Set up monthly investment contributions',    description: 'Automate index fund purchases on the 1st of each month.', status: 'active', createdAt: dayTs(y, 11, 23), taskDate: { type: 'single', start: dayTs(y + 1, 0, 1)  } },
    { title: 'Complete TypeScript advanced course',        status: 'active', createdAt: dayTs(y, 11, 24), taskDate: { type: 'range',  start: dayTs(y + 1, 0, 6),  end: dayTs(y + 1, 1, 28) } },
    { title: 'Plan 30th birthday trip',                    description: 'Shortlist: Japan, Iceland or Patagonia.', status: 'active', createdAt: dayTs(y, 11, 25), taskDate: { type: 'single', start: dayTs(y + 1, 3, 15) } },
    { title: 'Redecorate spare bedroom',                   status: 'active', createdAt: dayTs(y, 11, 26), taskDate: { type: 'range',  start: dayTs(y + 1, 2, 15), end: dayTs(y + 1, 2, 20) } },
    { title: 'Research electric car options',              description: 'Budget £35k – compare Tesla Model 3 vs BMW i4.', status: 'active', createdAt: dayTs(y, 11, 27) },
    { title: 'Schedule annual boiler service',             status: 'active', createdAt: dayTs(y, 11, 28), taskDate: { type: 'single', start: dayTs(y + 1, 0, 25) } },
    { title: 'Write blog post: lessons from this year',    description: 'Honest reflection – what worked, what didn\'t.', status: 'active', createdAt: dayTs(y, 11, 29), taskDate: { type: 'single', start: dayTs(y, 11, 31) } },
    { title: 'Organise digital photo albums',              status: 'active', createdAt: dayTs(y, 11, 30) },
  ];

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      await db.runAsync(
        `INSERT INTO tasks (id, title, description, status, created_at, task_date, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        generateId(),
        s.title,
        s.description ?? null,
        s.status,
        s.createdAt,
        s.taskDate ? JSON.stringify(s.taskDate) : null,
        i
      );
    }
  });
}

// ─── hook ─────────────────────────────────────────────────────────────────────
export function useTasks() {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);

  // ── Load from DB on mount ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const rows = await db.getAllAsync<DBRow>(
        'SELECT * FROM tasks ORDER BY sort_order ASC, created_at DESC'
      );
      if (rows.length === 0) {
        await seedTasks(db);
        const seeded = await db.getAllAsync<DBRow>(
          'SELECT * FROM tasks ORDER BY sort_order ASC, created_at DESC'
        );
        setTasks(seeded.map(rowToTask));
      } else {
        setTasks(rows.map(rowToTask));
      }
    })();
  }, []);

  const activeTasks   = useMemo(() => tasks.filter(t => t.status === 'active'),  [tasks]);
  const archivedTasks = useMemo(() => tasks.filter(t => t.status !== 'active'),  [tasks]);
  const activeCount   = activeTasks.length;
  const archivedCount = archivedTasks.length;

  // ── Add ───────────────────────────────────────────────────────────────────
  const addTask = useCallback(async (title: string, taskDate?: TaskDate, description?: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id  = generateId();
    const now = Date.now();
    const desc        = description?.trim() || null;
    const taskDateStr = taskDate ? JSON.stringify(taskDate) : null;

    const newTask: Task = {
      id, title: trimmed, status: 'active', createdAt: now,
      ...(desc       ? { description: desc }   : {}),
      ...(taskDate   ? { taskDate }            : {}),
    };

    // Optimistic update: new task goes to front
    setTasks(prev => [newTask, ...prev]);

    // Persist: shift existing active sort_orders up, insert at 0
    await db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE tasks SET sort_order = sort_order + 1 WHERE status = 'active'`);
      await db.runAsync(
        `INSERT INTO tasks (id, title, description, status, created_at, task_date, sort_order)
         VALUES (?, ?, ?, 'active', ?, ?, 0)`,
        id, trimmed, desc, now, taskDateStr
      );
    });
  }, [db]);

  // ── Complete ──────────────────────────────────────────────────────────────
  const completeTask = useCallback(async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' as const } : t));
    await db.runAsync(`UPDATE tasks SET status = 'completed' WHERE id = ?`, id);
  }, [db]);

  // ── Archive ───────────────────────────────────────────────────────────────
  const archiveTask = useCallback(async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'archived' as const } : t));
    await db.runAsync(`UPDATE tasks SET status = 'archived' WHERE id = ?`, id);
  }, [db]);

  // ── Delete (permanent) ────────────────────────────────────────────────────
  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await db.runAsync(`DELETE FROM tasks WHERE id = ?`, id);
  }, [db]);

  // ── Restore ───────────────────────────────────────────────────────────────
  const restoreTask = useCallback(async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'active' as const } : t));
    await db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE tasks SET sort_order = sort_order + 1 WHERE status = 'active'`);
      await db.runAsync(`UPDATE tasks SET status = 'active', sort_order = 0 WHERE id = ?`, id);
    });
  }, [db]);

  // ── Update title / date / description ────────────────────────────────────
  const updateTask = useCallback(async (id: string, title: string, taskDate?: TaskDate, description?: string) => {
    const desc        = description?.trim() || null;
    const taskDateStr = taskDate ? JSON.stringify(taskDate) : null;
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, title, taskDate: taskDate ?? undefined, description: desc ?? undefined }
        : t
    ));
    await db.runAsync(
      `UPDATE tasks SET title = ?, task_date = ?, description = ? WHERE id = ?`,
      title, taskDateStr, desc, id
    );
  }, [db]);

  // ── Reorder via drag ──────────────────────────────────────────────────────
  const reorderTasks = useCallback(async (reordered: Task[]) => {
    setTasks(prev => {
      const archived = prev.filter(t => t.status !== 'active');
      return [...reordered, ...archived];
    });
    await db.withTransactionAsync(async () => {
      for (let i = 0; i < reordered.length; i++) {
        await db.runAsync(`UPDATE tasks SET sort_order = ? WHERE id = ?`, i, reordered[i].id);
      }
    });
  }, [db]);

  return {
    activeTasks,
    archivedTasks,
    activeCount,
    archivedCount,
    addTask,
    completeTask,
    archiveTask,
    deleteTask,
    restoreTask,
    updateTask,
    reorderTasks,
  };
}
