const AUTH_STORAGE_KEY = 'ann_klee_auth_session_v1';

/**
 * Read/write a 1-year cookie backup on the same host (e.g. localhost across ports 5173/5174)
 * so switching dev server ports never loses the user's login session.
 */
const readAuthCookie = () => {
    if (typeof document === 'undefined' || !document.cookie) return null;
    try {
        const prefix = `${AUTH_STORAGE_KEY}=`;
        const match = document.cookie
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith(prefix));
        if (!match) return null;
        return decodeURIComponent(match.slice(prefix.length));
    } catch {
        return null;
    }
};

const writeAuthCookie = (jsonStr) => {
    if (typeof document === 'undefined') return;
    try {
        document.cookie = `${AUTH_STORAGE_KEY}=${encodeURIComponent(jsonStr)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
        // Ignore cookie write errors
    }
};

const clearAuthCookie = () => {
    if (typeof document === 'undefined') return;
    try {
        document.cookie = `${AUTH_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
        // Ignore cookie clear errors
    }
};

/**
 * Detects physical hardware type ('mobile' vs 'pc') independent of UI preview mode or DPI scaling.
 */
export const detectHardwareDeviceType = () => {
    if (typeof window === 'undefined') return 'pc';
    const ua = navigator.userAgent || '';
    const isTouchMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return (isTouchMobileUA || isIpadOS) ? 'mobile' : 'pc';
};

export const getDefaultUserSession = () => ({
    role: 'user',
    username: null,
    label: 'User (បានត្រឹមតែមើល)',
    deviceType: detectHardwareDeviceType(),
    loggedInAt: null
});

export const loadAuthSession = () => {
    const currentDeviceType = detectHardwareDeviceType();
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY) || readAuthCookie();
        if (!raw) return getDefaultUserSession();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return getDefaultUserSession();

        // Keep localStorage & cookie in sync if recovered from cookie across localhost ports
        try {
            if (!localStorage.getItem(AUTH_STORAGE_KEY)) {
                localStorage.setItem(AUTH_STORAGE_KEY, raw);
            }
            writeAuthCookie(raw);
        } catch {
            // Ignore sync errors
        }

        if (parsed.role === 'owner' && parsed.username === 'thonvisal') {
            return {
                role: 'owner',
                username: 'thonvisal',
                label: 'Owner (ម្ចាស់ប្រព័ន្ធ)',
                deviceType: currentDeviceType,
                loggedInAt: parsed.loggedInAt || null
            };
        }

        if (parsed.role === 'admin' && (parsed.username === 'annkle' || parsed.username === 'annklee')) {
            return {
                role: 'admin',
                username: 'annkle',
                label: 'Admin (អ្នកគ្រប់គ្រង)',
                deviceType: currentDeviceType,
                loggedInAt: parsed.loggedInAt || null
            };
        }

        return getDefaultUserSession();
    } catch {
        return getDefaultUserSession();
    }
};

export const authenticateUser = (usernameInput, pinInput) => {
    const username = String(usernameInput || '').trim().toLowerCase();
    const pin = String(pinInput || '').trim();
    const currentDeviceType = detectHardwareDeviceType();

    if (username === 'thonvisal' && pin === 'change8651') {
        const session = {
            role: 'owner',
            username: 'thonvisal',
            label: 'Owner (ម្ចាស់ប្រព័ន្ធ)',
            deviceType: currentDeviceType,
            loggedInAt: new Date().toISOString()
        };
        try {
            const raw = JSON.stringify(session);
            localStorage.setItem(AUTH_STORAGE_KEY, raw);
            writeAuthCookie(raw);
        } catch (e) {
            console.error('Failed to persist auth session:', e);
        }
        return { ok: true, session };
    }

    if ((username === 'annkle' || username === 'annklee') && pin === '123') {
        const session = {
            role: 'admin',
            username: 'annkle',
            label: 'Admin (អ្នកគ្រប់គ្រង)',
            deviceType: currentDeviceType,
            loggedInAt: new Date().toISOString()
        };
        try {
            const raw = JSON.stringify(session);
            localStorage.setItem(AUTH_STORAGE_KEY, raw);
            writeAuthCookie(raw);
        } catch (e) {
            console.error('Failed to persist auth session:', e);
        }
        return { ok: true, session };
    }

    return {
        ok: false,
        error: 'ឈ្មោះគណនី (Username) ឬលេខសម្ងាត់ (PIN) មិនត្រឹមត្រូវទេ!'
    };
};

export const logoutAuthSession = () => {
    try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        clearAuthCookie();
    } catch (e) {
        console.error('Failed to clear auth session:', e);
    }
    return getDefaultUserSession();
};

