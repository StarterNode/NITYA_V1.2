/**
 * SessionService.test.js
 * Unit tests for Session state management service
 */

const SessionService = require('../../../server/services/SessionService');
const DataService = require('../../../server/services/DataService');
const FileService = require('../../../server/services/FileService');

describe('SessionService', () => {
    let sessionService;
    let mockDataService;
    const testUserId = 'test_user_001';

    beforeEach(() => {
        mockDataService = new DataService({ fileService: new FileService() });
        sessionService = new SessionService({ dataService: mockDataService });
    });

    afterEach(() => {
        sessionService.clearCache();
        sessionService = null;
    });

    describe('Initialization', () => {
        test('should initialize with DataService', () => {
            expect(sessionService.dataService).toBeDefined();
        });

        test('should initialize sessions Map', () => {
            expect(sessionService.sessions).toBeDefined();
            expect(sessionService.sessions instanceof Map).toBe(true);
        });

        test('should extend BaseService', () => {
            expect(sessionService.logger).toBeDefined();
            expect(sessionService.config).toBeDefined();
        });
    });

    describe('getSession()', () => {
        test('should create session for new user', async () => {
            const session = await sessionService.getSession(testUserId);

            expect(session).toBeDefined();
            expect(session).toHaveProperty('userId');
            expect(session).toHaveProperty('createdAt');
            expect(session).toHaveProperty('lastActivityAt');
            expect(session).toHaveProperty('messageCount');
            expect(session).toHaveProperty('isResumed');
            expect(session.userId).toBe(testUserId);
        });

        test('should return cached session on second call', async () => {
            const session1 = await sessionService.getSession(testUserId);
            const session2 = await sessionService.getSession(testUserId);

            expect(session1).toBe(session2); // Same object reference
        });

        test('should have valid timestamps', async () => {
            const session = await sessionService.getSession(testUserId);

            expect(typeof session.createdAt).toBe('string');
            expect(typeof session.lastActivityAt).toBe('string');
            expect(new Date(session.createdAt).toString()).not.toBe('Invalid Date');
            expect(new Date(session.lastActivityAt).toString()).not.toBe('Invalid Date');
        });

        test('should determine if session is resumed', async () => {
            const session = await sessionService.getSession(testUserId);

            expect(typeof session.isResumed).toBe('boolean');
            expect(typeof session.messageCount).toBe('number');
            expect(session.messageCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('isResumedSession()', () => {
        test('should return boolean', async () => {
            const isResumed = await sessionService.isResumedSession(testUserId);
            expect(typeof isResumed).toBe('boolean');
        });

        test('should match session.isResumed', async () => {
            const session = await sessionService.getSession(testUserId);
            const isResumed = await sessionService.isResumedSession(testUserId);

            expect(isResumed).toBe(session.isResumed);
        });
    });

    describe('getSessionContext()', () => {
        test('should return session context object', async () => {
            const context = await sessionService.getSessionContext(testUserId);

            expect(context).toBeDefined();
            expect(context).toHaveProperty('userId');
            expect(context).toHaveProperty('sessionType');
            expect(context).toHaveProperty('messageCount');
            expect(context).toHaveProperty('createdAt');
            expect(context).toHaveProperty('lastActivityAt');
        });

        test('should have correct sessionType', async () => {
            const context = await sessionService.getSessionContext(testUserId);

            expect(['new', 'resumed']).toContain(context.sessionType);
        });

        test('should include userId in context', async () => {
            const context = await sessionService.getSessionContext(testUserId);

            expect(context.userId).toBe(testUserId);
        });

        test('should have valid messageCount', async () => {
            const context = await sessionService.getSessionContext(testUserId);

            expect(typeof context.messageCount).toBe('number');
            expect(context.messageCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('touchSession()', () => {
        test('should update lastActivityAt', async () => {
            await sessionService.getSession(testUserId);

            const beforeTouch = sessionService.sessions.get(testUserId).lastActivityAt;

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            await sessionService.touchSession(testUserId);

            const afterTouch = sessionService.sessions.get(testUserId).lastActivityAt;

            expect(afterTouch).not.toBe(beforeTouch);
        });

        test('should not throw for non-existent session', async () => {
            await expect(
                sessionService.touchSession('non_existent_user')
            ).resolves.not.toThrow();
        });
    });

    describe('clearCache()', () => {
        test('should clear specific user session', async () => {
            await sessionService.getSession(testUserId);
            expect(sessionService.sessions.has(testUserId)).toBe(true);

            sessionService.clearCache(testUserId);
            expect(sessionService.sessions.has(testUserId)).toBe(false);
        });

        test('should clear all sessions if no userId provided', async () => {
            await sessionService.getSession('user1');
            await sessionService.getSession('user2');

            expect(sessionService.sessions.size).toBeGreaterThanOrEqual(2);

            sessionService.clearCache();
            expect(sessionService.sessions.size).toBe(0);
        });
    });

    describe('getActiveSessions()', () => {
        test('should return array of sessions', async () => {
            const sessions = sessionService.getActiveSessions();

            expect(Array.isArray(sessions)).toBe(true);
        });

        test('should return sessions with userId', async () => {
            await sessionService.getSession(testUserId);

            const sessions = sessionService.getActiveSessions();

            sessions.forEach(session => {
                expect(session).toHaveProperty('userId');
                expect(session).toHaveProperty('createdAt');
                expect(session).toHaveProperty('lastActivityAt');
            });
        });

        test('should return multiple sessions', async () => {
            await sessionService.getSession('user1');
            await sessionService.getSession('user2');
            await sessionService.getSession('user3');

            const sessions = sessionService.getActiveSessions();
            expect(sessions.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Session Caching', () => {
        test('should cache sessions in memory', async () => {
            expect(sessionService.sessions.size).toBe(0);

            await sessionService.getSession(testUserId);
            expect(sessionService.sessions.size).toBe(1);

            await sessionService.getSession('user2');
            expect(sessionService.sessions.size).toBe(2);
        });

        test('should use cached session on repeated calls', async () => {
            const session1 = await sessionService.getSession(testUserId);
            const session2 = await sessionService.getSession(testUserId);
            const session3 = await sessionService.getSession(testUserId);

            expect(session1).toBe(session2);
            expect(session2).toBe(session3);
        });
    });
});
