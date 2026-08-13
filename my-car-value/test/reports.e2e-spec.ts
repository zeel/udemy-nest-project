import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';
import { UsersService } from './../src/users/users.service';

const report = {
  make: 'Honda',
  model: 'Civic',
  year: 2021,
  mileage: 12000,
  lng: -122.4194,
  lat: 37.7749,
  price: 22000,
};

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    usersService = moduleFixture.get(UsersService);
  });

  afterEach(async () => {
    await app.close();
  });

  /** Signs a user up and returns an agent carrying its session cookie. */
  const signedInAgent = async (email = 'a@b.com') => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post('/auth/signup')
      .send({ email, password: 'mypassword' })
      .expect(201);

    return { agent, userId: res.body.id as number };
  };

  /** Same, but promoted to admin — approval routes are behind AdminGuard. */
  const signedInAdmin = async (email = 'admin@b.com') => {
    const { agent, userId } = await signedInAgent(email);
    await usersService.update(userId, { admin: true });

    return { agent, userId };
  };

  describe('create', () => {
    it('is blocked when signed out', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .send(report)
        .expect(403);
    });

    it('creates an unapproved report owned by the current user', async () => {
      const { agent, userId } = await signedInAgent();

      const res = await agent.post('/reports').send(report).expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.approved).toBe(false);
      expect(res.body.userId).toEqual(userId);
    });

    it('rejects an out-of-range year and a bad latitude', async () => {
      const { agent } = await signedInAgent();

      await agent
        .post('/reports')
        .send({ ...report, year: 1800 })
        .expect(400);
      await agent
        .post('/reports')
        .send({ ...report, lat: 999 })
        .expect(400);
    });

    it('strips fields that are not on the DTO', async () => {
      const { agent } = await signedInAgent();

      const res = await agent
        .post('/reports')
        .send({ ...report, approved: true })
        .expect(201);

      expect(res.body.approved).toBe(false);
    });
  });

  describe('approval', () => {
    it('is blocked when signed out', async () => {
      const { agent } = await signedInAgent();
      const created = await agent.post('/reports').send(report).expect(201);

      await request(app.getHttpServer())
        .patch(`/reports/${created.body.id}`)
        .send({ approved: true })
        .expect(403);
    });

    it('is blocked for a signed-in NON-admin', async () => {
      const { agent } = await signedInAgent();
      const created = await agent.post('/reports').send(report).expect(201);

      await agent
        .patch(`/reports/${created.body.id}`)
        .send({ approved: true })
        .expect(403);
    });

    it('approves and un-approves, keeping userId in the response', async () => {
      const { agent, userId } = await signedInAdmin();
      const created = await agent.post('/reports').send(report).expect(201);

      const approved = await agent
        .patch(`/reports/${created.body.id}`)
        .send({ approved: true })
        .expect(200);
      expect(approved.body.approved).toBe(true);
      // Regression: changeApproval must load the user relation, or the
      // response silently drops the userId that create() returns.
      expect(approved.body.userId).toEqual(userId);

      const reverted = await agent
        .patch(`/reports/${created.body.id}`)
        .send({ approved: false })
        .expect(200);
      expect(reverted.body.approved).toBe(false);
    });

    it('rejects a non-boolean approved value', async () => {
      const { agent } = await signedInAdmin();
      const created = await agent.post('/reports').send(report).expect(201);

      await agent
        .patch(`/reports/${created.body.id}`)
        .send({ approved: 'yes' })
        .expect(400);
    });

    it('404s for a report that does not exist', async () => {
      const { agent } = await signedInAdmin();

      await agent.patch('/reports/9999').send({ approved: true }).expect(404);
    });

    it('400s on a non-numeric id', async () => {
      const { agent } = await signedInAdmin();

      await agent.patch('/reports/abc').send({ approved: true }).expect(400);
    });
  });

  describe('estimate', () => {
    const base = { make: 'Honda', model: 'Civic', year: 2020, lng: -122.4, lat: 37.7 };
    const query = 'make=Honda&model=Civic&year=2020&lng=-122.4&lat=37.7';

    /** Creates a report and approves it, using the admin's own agent. */
    const approvedReport = async (
      agent: ReturnType<typeof request.agent>,
      mileage: number,
      price: number,
    ) => {
      const res = await agent
        .post('/reports')
        .send({ ...base, mileage, price })
        .expect(201);
      await agent
        .patch(`/reports/${res.body.id}`)
        .send({ approved: true })
        .expect(200);
    };

    it('averages the three closest approved reports by mileage', async () => {
      const { agent } = await signedInAdmin();
      await approvedReport(agent, 10000, 10000);
      await approvedReport(agent, 20000, 20000);
      await approvedReport(agent, 30000, 30000);

      const res = await request(app.getHttpServer())
        .get(`/reports?${query}&mileage=15000`)
        .expect(200);

      expect(res.body.price).toEqual(20000);
    });

    it('uses only the closest three, not every match', async () => {
      // Regression: `SELECT AVG(price) ... LIMIT 3` averages *all* matches,
      // because the aggregate collapses to one row before LIMIT applies.
      const { agent } = await signedInAdmin();
      await approvedReport(agent, 10000, 10000);
      await approvedReport(agent, 20000, 20000);
      await approvedReport(agent, 30000, 30000);
      await approvedReport(agent, 100000, 1000000);

      const near = await request(app.getHttpServer())
        .get(`/reports?${query}&mileage=10000`)
        .expect(200);
      expect(near.body.price).toEqual(20000); // not 265000

      const far = await request(app.getHttpServer())
        .get(`/reports?${query}&mileage=95000`)
        .expect(200);
      expect(far.body.price).toEqual(350000);
    });

    it('ignores unapproved reports', async () => {
      const { agent } = await signedInAdmin();
      await approvedReport(agent, 10000, 10000);
      await agent
        .post('/reports')
        .send({ ...base, mileage: 11000, price: 999999 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/reports?${query}&mileage=10000`)
        .expect(200);

      expect(res.body.price).toEqual(10000);
    });

    it('returns null when nothing matches', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports?make=Tesla&model=X&year=2020&lng=-122.4&lat=37.7&mileage=1000`)
        .expect(200);

      expect(res.body.price).toBeNull();
    });

    it('filters by make, location and year window', async () => {
      const { agent } = await signedInAdmin();
      await approvedReport(agent, 10000, 10000);

      const server = app.getHttpServer();
      await request(server)
        .get(`/reports?make=Toyota&model=Civic&year=2020&lng=-122.4&lat=37.7&mileage=10000`)
        .expect(200)
        .expect((r) => expect(r.body.price).toBeNull());
      await request(server)
        .get(`/reports?make=Honda&model=Civic&year=2020&lng=0&lat=0&mileage=10000`)
        .expect(200)
        .expect((r) => expect(r.body.price).toBeNull());
      await request(server)
        .get(`/reports?${query.replace('year=2020', 'year=2010')}&mileage=10000`)
        .expect(200)
        .expect((r) => expect(r.body.price).toBeNull());
    });

    it('rejects malformed query params', async () => {
      const server = app.getHttpServer();
      await request(server).get(`/reports?${query}`).expect(400); // no mileage
      await request(server).get(`/reports?${query}&mileage=abc`).expect(400);
      await request(server).get('/reports').expect(400);
    });
  });

  it('preserves coordinate precision through a write and re-read', async () => {
    // Regression: a plain @Column() maps to sqlite `integer`, and TypeORM
    // parseInt()s it on read, turning 37.7749 into 37.
    const { agent } = await signedInAdmin();

    const created = await agent.post('/reports').send(report).expect(201);
    const reread = await agent
      .patch(`/reports/${created.body.id}`)
      .send({ approved: true })
      .expect(200);

    expect(reread.body.lng).toBeCloseTo(-122.4194, 4);
    expect(reread.body.lat).toBeCloseTo(37.7749, 4);
  });
});
