/**
 * Notification Scheduler Tests
 * Verifies all scheduling safety constraints without hitting the live API.
 *
 * Run: node --test tests/notification-scheduler.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Pure validation logic (mirrors admin-notifications-api.js) ──────────────
// Must stay in sync with validateScheduledAt() in the Worker.

function validateScheduledAt(scheduled_at, recurrence, is_template) {
    if (!scheduled_at || is_template) return null;
    const schedDate = new Date(scheduled_at);
    if (isNaN(schedDate.getTime())) return 'Invalid scheduled_at date';
    if ((recurrence || 'none') === 'none' && schedDate <= new Date()) {
        return 'Scheduled time is in the past. Please pick a future time.';
    }
    return null;
}

// Mirrors the send action's scheduled guard in admin-notifications-api.js
function canSendImmediately(notif, override_schedule = false) {
    if (notif.status === 'sending')   return { ok: false, error: 'Already sending' };
    if (notif.status === 'cancelled') return { ok: false, error: 'Cannot send cancelled notification' };
    if (notif.status === 'scheduled' && !override_schedule) {
        return {
            ok: false,
            is_scheduled: true,
            scheduled_at: notif.scheduled_at,
            error: 'Notification is scheduled. Pass override_schedule:true to bypass.',
        };
    }
    return { ok: true };
}

// Mirrors saveAndOpenSafety()'s redirect check in admin-notifications.html
function shouldOpenSafetyModal(scheduled_at) {
    if (!scheduled_at) return true;             // no schedule → open safety modal (immediate send)
    return new Date(scheduled_at) <= new Date(); // past time → also open (backend will reject)
}

// Mirrors the status derivation in create/update actions
function deriveStatus(scheduled_at, force_draft = false) {
    if (force_draft) return 'draft';
    return scheduled_at ? 'scheduled' : 'draft';
}

// Mirrors process_scheduled's filter
function isPickedByCron(notif) {
    return notif.status === 'scheduled'
        && !notif.is_template
        && new Date(notif.scheduled_at) <= new Date();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const in5Min    = () => new Date(Date.now() +    5 * 60_000).toISOString();
const inOneDay  = () => new Date(Date.now() + 86_400_000).toISOString();
const minus1Min = () => new Date(Date.now() -       60_000).toISOString();
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString();

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Past-time validation', () => {
    it('rejects scheduled_at 1 minute in the past', () => {
        const err = validateScheduledAt(minus1Min(), 'none', false);
        assert.match(err, /past/i);
    });

    it('rejects scheduled_at yesterday', () => {
        const err = validateScheduledAt(yesterday(), 'none', false);
        assert.match(err, /past/i);
    });

    it('accepts scheduled_at +5 minutes', () => {
        assert.equal(validateScheduledAt(in5Min(), 'none', false), null);
    });

    it('accepts scheduled_at tomorrow', () => {
        assert.equal(validateScheduledAt(inOneDay(), 'none', false), null);
    });

    it('skips past-time check for daily recurring (time may have passed for today)', () => {
        // Recurring notifications use the same time-of-day each cycle; past base time is valid
        assert.equal(validateScheduledAt(minus1Min(), 'daily', false), null);
    });

    it('skips past-time check for weekly recurring', () => {
        assert.equal(validateScheduledAt(minus1Min(), 'weekly', false), null);
    });

    it('skips validation entirely for templates', () => {
        assert.equal(validateScheduledAt(minus1Min(), 'none', true), null);
    });

    it('rejects an invalid date string', () => {
        const err = validateScheduledAt('not-a-date', 'none', false);
        assert.match(err, /invalid/i);
    });

    it('returns null when scheduled_at is empty (draft mode)', () => {
        assert.equal(validateScheduledAt('', 'none', false), null);
        assert.equal(validateScheduledAt(null, 'none', false), null);
    });
});

describe('Immediate send blocked for scheduled notifications', () => {
    it('Schedule for +5 minutes → must not send immediately', () => {
        const notif = { status: 'scheduled', scheduled_at: in5Min() };
        const result = canSendImmediately(notif);
        assert.equal(result.ok, false, 'Scheduled notification must not send immediately');
        assert.equal(result.is_scheduled, true);
    });

    it('Schedule for tomorrow → must not send immediately', () => {
        const notif = { status: 'scheduled', scheduled_at: inOneDay() };
        const result = canSendImmediately(notif);
        assert.equal(result.ok, false, 'Scheduled notification must not send immediately');
    });

    it('override_schedule:true bypasses the guard (intentional operator override)', () => {
        const notif = { status: 'scheduled', scheduled_at: in5Min() };
        const result = canSendImmediately(notif, true);
        assert.equal(result.ok, true);
    });

    it('draft status → can send immediately', () => {
        const notif = { status: 'draft', scheduled_at: null };
        assert.equal(canSendImmediately(notif).ok, true);
    });

    it('failed status → can retry (send) immediately', () => {
        const notif = { status: 'failed', scheduled_at: null };
        assert.equal(canSendImmediately(notif).ok, true);
    });

    it('already-sending → blocked', () => {
        const notif = { status: 'sending' };
        const result = canSendImmediately(notif);
        assert.equal(result.ok, false);
        assert.match(result.error, /sending/i);
    });

    it('cancelled → blocked', () => {
        const notif = { status: 'cancelled' };
        const result = canSendImmediately(notif);
        assert.equal(result.ok, false);
        assert.match(result.error, /cancelled/i);
    });
});

describe('Frontend safety modal routing', () => {
    it('no schedule → opens safety modal for immediate send', () => {
        assert.equal(shouldOpenSafetyModal(null), true);
        assert.equal(shouldOpenSafetyModal(''), true);
    });

    it('future schedule → does NOT open safety modal (redirected to scheduled save)', () => {
        assert.equal(shouldOpenSafetyModal(in5Min()), false);
        assert.equal(shouldOpenSafetyModal(inOneDay()), false);
    });

    it('past schedule → opens safety modal (backend will reject with 400)', () => {
        assert.equal(shouldOpenSafetyModal(minus1Min()), true);
    });
});

describe('Edit scheduled notification → remains scheduled', () => {
    it('editing title while keeping scheduled_at preserves scheduled status', () => {
        const future = in5Min();
        assert.equal(deriveStatus(future), 'scheduled');
    });

    it('"Save Draft" button strips schedule (force_draft=true → status becomes draft)', () => {
        const future = in5Min();
        assert.equal(deriveStatus(future, true), 'draft');
    });

    it('removing scheduled_at on edit reverts to draft', () => {
        assert.equal(deriveStatus(null), 'draft');
        assert.equal(deriveStatus(''), 'draft');
    });
});

describe('Delete scheduled notification → never sends', () => {
    it('deleted notification is absent from DB → not picked by cron', () => {
        const allRows = [
            { id: 'abc', status: 'scheduled', scheduled_at: minus1Min(), is_template: false },
            { id: 'def', status: 'scheduled', scheduled_at: in5Min(), is_template: false },
        ];
        // Simulate delete of 'abc'
        const afterDelete = allRows.filter(r => r.id !== 'abc');
        const dueRows = afterDelete.filter(isPickedByCron);
        assert.equal(dueRows.some(r => r.id === 'abc'), false, 'Deleted notif must not be sent');
    });

    it('cancelled notification is not picked by cron', () => {
        const notif = { id: 'xyz', status: 'cancelled', scheduled_at: minus1Min(), is_template: false };
        assert.equal(isPickedByCron(notif), false);
    });

    it('template notifications are never picked by cron even when scheduled', () => {
        const notif = { id: 'tpl', status: 'scheduled', scheduled_at: minus1Min(), is_template: true };
        assert.equal(isPickedByCron(notif), false);
    });
});

describe('Cron process_scheduled eligibility', () => {
    it('only rows with status=scheduled AND scheduled_at <= now are due', () => {
        const rows = [
            { id: '1', status: 'scheduled', scheduled_at: minus1Min(), is_template: false }, // due
            { id: '2', status: 'scheduled', scheduled_at: in5Min(),    is_template: false }, // future
            { id: '3', status: 'draft',     scheduled_at: minus1Min(), is_template: false }, // wrong status
            { id: '4', status: 'scheduled', scheduled_at: minus1Min(), is_template: true  }, // template
        ];
        const due = rows.filter(isPickedByCron);
        assert.equal(due.length, 1);
        assert.equal(due[0].id, '1');
    });
});
