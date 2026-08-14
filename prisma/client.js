const { PrismaClient } = require('@prisma/client');
const tenantGuardExtension = require('./tenantGuardExtension');

const prisma = new PrismaClient().$extends(tenantGuardExtension);

module.exports = prisma;