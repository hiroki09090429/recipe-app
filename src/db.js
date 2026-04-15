import Dexie from 'dexie';
import CryptoJS from 'crypto-js';

export const db = new Dexie('RecipeAppDB');

db.version(1).stores({
  users: '++id, username',
  recipes: '++id, userId, name, category, registrationNo, createdAt',
  categories: '++id, userId, name',
});

// SHA-256 hash using crypto-js (works on both HTTP and HTTPS)
export async function hashPassword(password) {
  return CryptoJS.SHA256(password).toString();
}

// User operations
export async function createUser(username, password) {
  const existing = await db.users.where('username').equals(username).first();
  if (existing) throw new Error('このユーザー名は既に使用されています');
  const hashedPassword = await hashPassword(password);
  const id = await db.users.add({ username, password: hashedPassword, createdAt: new Date().toISOString() });
  return id;
}

export async function loginUser(username, password) {
  const user = await db.users.where('username').equals(username).first();
  if (!user) throw new Error('アカウントが見つかりません。まず「新規登録」してください');
  const hashedPassword = await hashPassword(password);
  if (user.password !== hashedPassword) throw new Error('パスワードが違います');
  return user;
}

// Recipe operations
export async function getRecipes(userId) {
  return db.recipes.where('userId').equals(userId).toArray();
}

export async function getRecipe(id) {
  return db.recipes.get(id);
}

export async function addRecipe(recipe) {
  const userRecipes = await db.recipes.where('userId').equals(recipe.userId).toArray();
  const maxNo = userRecipes.reduce((max, r) => Math.max(max, r.registrationNo || 0), 0);
  const now = new Date().toISOString();
  return db.recipes.add({
    ...recipe,
    registrationNo: maxNo + 1,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateRecipe(id, recipe) {
  return db.recipes.update(id, { ...recipe, updatedAt: new Date().toISOString() });
}

export async function deleteRecipe(id) {
  return db.recipes.delete(id);
}

// Category operations
export async function getCategories(userId) {
  return db.categories.where('userId').equals(userId).toArray();
}

export async function addCategory(userId, name) {
  const existing = await db.categories.where({ userId, name }).first();
  if (existing) return existing.id;
  return db.categories.add({ userId, name });
}

export async function deleteCategory(id) {
  return db.categories.delete(id);
}

// Export all data for a user (returns plain object, no passwords)
export async function exportUserData(userId) {
  const recipes = await db.recipes.where('userId').equals(userId).toArray();
  const categories = await db.categories.where('userId').equals(userId).toArray();
  return { version: 1, exportedAt: new Date().toISOString(), recipes, categories };
}

// Import data for a user (merges categories, replaces recipes by registrationNo)
export async function importUserData(userId, data) {
  if (!data || data.version !== 1) throw new Error('ファイル形式が正しくありません');
  const categories = data.categories || [];
  const recipes = data.recipes || [];
  // Import categories (skip duplicates)
  for (const cat of categories) {
    const { id: _id, userId: _uid, ...rest } = cat;
    const existing = await db.categories.where({ userId, name: rest.name }).first();
    if (!existing) await db.categories.add({ ...rest, userId });
  }
  // Import recipes (upsert by registrationNo)
  for (const recipe of recipes) {
    const { id: _id, userId: _uid, ...rest } = recipe;
    const existing = await db.recipes
      .where({ userId, registrationNo: rest.registrationNo })
      .first();
    if (existing) {
      await db.recipes.update(existing.id, { ...rest, userId });
    } else {
      await db.recipes.add({ ...rest, userId });
    }
  }
}
