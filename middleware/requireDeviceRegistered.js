const prisma = require('../prisma/client');

// Requires the request to identify itself with an X-Device-Id header that's
// already registered (via POST /sync/devices/register) for the resolved
// shop. Runs after tenantContext, so req.tenant.shopId is available.
module.exports = async function requireDeviceRegistered(req, res, next) {
    try {
        const deviceId = req.headers['x-device-id'];
        if (!deviceId) {
            return res.status(400).json({ code: 'DEVICE_ID_HEADER_REQUIRED', message: 'X-Device-Id header is required' });
        }

        const device = await prisma.device.findFirst({
            where: { shopId: req.tenant.shopId, deviceId, isActive: true },
        });

        if (!device) {
            return res.status(404).json({ code: 'DEVICE_NOT_REGISTERED', message: 'Register this device first via POST /sync/devices/register' });
        }

        req.device = device;
        next();
    } catch (err) {
        console.error('requireDeviceRegistered error:', err);
        res.status(500).json({ message: 'Server error checking device registration' });
    }
};
