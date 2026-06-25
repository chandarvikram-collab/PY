export type FoodItem = {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  category: string;
};

const FOODS: FoodItem[] = [
  // ─── PROTEINS ───
  { id: "pr01", name: "Chicken Breast", servingSize: 100, servingUnit: "g", calories: 165, protein: 31, carbs: 0, fat: 4, fiber: 0, sugar: 0, sodium: 74, category: "Proteins" },
  { id: "pr02", name: "Salmon Fillet", servingSize: 100, servingUnit: "g", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59, category: "Proteins" },
  { id: "pr03", name: "Ground Beef 80/20", servingSize: 100, servingUnit: "g", calories: 254, protein: 17, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 72, category: "Proteins" },
  { id: "pr04", name: "Egg, Large", servingSize: 50, servingUnit: "g (1 egg)", calories: 72, protein: 6, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 71, category: "Proteins" },
  { id: "pr05", name: "Tuna in Water", servingSize: 85, servingUnit: "g (3 oz)", calories: 109, protein: 25, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 287, category: "Proteins" },
  { id: "pr06", name: "Shrimp, Cooked", servingSize: 85, servingUnit: "g (3 oz)", calories: 84, protein: 18, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 94, category: "Proteins" },
  { id: "pr07", name: "Turkey Breast", servingSize: 85, servingUnit: "g (3 oz)", calories: 125, protein: 26, carbs: 0, fat: 2, fiber: 0, sugar: 0, sodium: 50, category: "Proteins" },
  { id: "pr08", name: "Firm Tofu", servingSize: 100, servingUnit: "g", calories: 76, protein: 8, carbs: 2, fat: 4, fiber: 0, sugar: 1, sodium: 7, category: "Proteins" },
  { id: "pr09", name: "Tempeh", servingSize: 85, servingUnit: "g (3 oz)", calories: 161, protein: 15, carbs: 9, fat: 9, fiber: 0, sugar: 0, sodium: 9, category: "Proteins" },
  { id: "pr10", name: "Whey Protein Powder", servingSize: 30, servingUnit: "g (1 scoop)", calories: 120, protein: 24, carbs: 3, fat: 2, fiber: 0, sugar: 2, sodium: 130, category: "Proteins" },
  { id: "pr11", name: "Pork Tenderloin", servingSize: 85, servingUnit: "g (3 oz)", calories: 122, protein: 22, carbs: 0, fat: 3, fiber: 0, sugar: 0, sodium: 48, category: "Proteins" },
  { id: "pr12", name: "Lean Ground Turkey", servingSize: 85, servingUnit: "g (3 oz)", calories: 120, protein: 22, carbs: 0, fat: 3, fiber: 0, sugar: 0, sodium: 70, category: "Proteins" },
  { id: "pr13", name: "Cod Fillet", servingSize: 85, servingUnit: "g (3 oz)", calories: 89, protein: 19, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 66, category: "Proteins" },
  { id: "pr14", name: "Tilapia Fillet", servingSize: 85, servingUnit: "g (3 oz)", calories: 110, protein: 22, carbs: 0, fat: 2, fiber: 0, sugar: 0, sodium: 56, category: "Proteins" },
  { id: "pr15", name: "Canned Salmon", servingSize: 85, servingUnit: "g (3 oz)", calories: 130, protein: 17, carbs: 0, fat: 6, fiber: 0, sugar: 0, sodium: 350, category: "Proteins" },

  // ─── GRAINS ───
  { id: "gr01", name: "White Rice, Cooked", servingSize: 186, servingUnit: "g (1 cup)", calories: 206, protein: 4, carbs: 45, fat: 0, fiber: 1, sugar: 0, sodium: 1, category: "Grains" },
  { id: "gr02", name: "Brown Rice, Cooked", servingSize: 195, servingUnit: "g (1 cup)", calories: 216, protein: 5, carbs: 45, fat: 2, fiber: 4, sugar: 0, sodium: 2, category: "Grains" },
  { id: "gr03", name: "Oatmeal, Cooked", servingSize: 234, servingUnit: "g (1 cup)", calories: 166, protein: 6, carbs: 32, fat: 4, fiber: 4, sugar: 0, sodium: 9, category: "Grains" },
  { id: "gr04", name: "Whole Wheat Bread", servingSize: 28, servingUnit: "g (1 slice)", calories: 79, protein: 4, carbs: 15, fat: 1, fiber: 2, sugar: 1, sodium: 146, category: "Grains" },
  { id: "gr05", name: "Pasta, Cooked", servingSize: 140, servingUnit: "g (1 cup)", calories: 220, protein: 8, carbs: 43, fat: 1, fiber: 3, sugar: 1, sodium: 1, category: "Grains" },
  { id: "gr06", name: "Quinoa, Cooked", servingSize: 185, servingUnit: "g (1 cup)", calories: 222, protein: 8, carbs: 39, fat: 4, fiber: 5, sugar: 2, sodium: 13, category: "Grains" },
  { id: "gr07", name: "Plain Bagel", servingSize: 105, servingUnit: "g (1 bagel)", calories: 270, protein: 11, carbs: 53, fat: 2, fiber: 2, sugar: 5, sodium: 440, category: "Grains" },
  { id: "gr08", name: "Flour Tortilla, Medium", servingSize: 45, servingUnit: "g (1 tortilla)", calories: 146, protein: 4, carbs: 26, fat: 3, fiber: 2, sugar: 1, sodium: 307, category: "Grains" },
  { id: "gr09", name: "Sweet Potato", servingSize: 130, servingUnit: "g (medium)", calories: 112, protein: 2, carbs: 26, fat: 0, fiber: 4, sugar: 5, sodium: 72, category: "Grains" },
  { id: "gr10", name: "White Potato", servingSize: 150, servingUnit: "g (medium)", calories: 130, protein: 3, carbs: 30, fat: 0, fiber: 2, sugar: 1, sodium: 8, category: "Grains" },
  { id: "gr11", name: "Corn Tortilla", servingSize: 28, servingUnit: "g (1 small)", calories: 60, protein: 2, carbs: 12, fat: 1, fiber: 2, sugar: 0, sodium: 20, category: "Grains" },
  { id: "gr12", name: "Rice Cakes", servingSize: 18, servingUnit: "g (2 cakes)", calories: 70, protein: 2, carbs: 15, fat: 1, fiber: 0, sugar: 0, sodium: 29, category: "Grains" },
  { id: "gr13", name: "Whole Wheat Crackers", servingSize: 28, servingUnit: "g (7 crackers)", calories: 120, protein: 3, carbs: 20, fat: 4, fiber: 3, sugar: 2, sodium: 140, category: "Grains" },
  { id: "gr14", name: "Granola", servingSize: 60, servingUnit: "g (½ cup)", calories: 299, protein: 7, carbs: 47, fat: 9, fiber: 4, sugar: 16, sodium: 102, category: "Grains" },
  { id: "gr15", name: "English Muffin", servingSize: 57, servingUnit: "g (1 muffin)", calories: 134, protein: 5, carbs: 26, fat: 1, fiber: 2, sugar: 2, sodium: 240, category: "Grains" },

  // ─── DAIRY ───
  { id: "da01", name: "Whole Milk", servingSize: 240, servingUnit: "ml (1 cup)", calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, sugar: 12, sodium: 105, category: "Dairy" },
  { id: "da02", name: "2% Milk", servingSize: 240, servingUnit: "ml (1 cup)", calories: 122, protein: 8, carbs: 12, fat: 5, fiber: 0, sugar: 12, sodium: 115, category: "Dairy" },
  { id: "da03", name: "Greek Yogurt, Plain", servingSize: 170, servingUnit: "g (6 oz)", calories: 100, protein: 17, carbs: 6, fat: 1, fiber: 0, sugar: 6, sodium: 57, category: "Dairy" },
  { id: "da04", name: "Cottage Cheese", servingSize: 226, servingUnit: "g (1 cup)", calories: 206, protein: 25, carbs: 8, fat: 5, fiber: 0, sugar: 8, sodium: 820, category: "Dairy" },
  { id: "da05", name: "Cheddar Cheese", servingSize: 28, servingUnit: "g (1 oz)", calories: 115, protein: 7, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 180, category: "Dairy" },
  { id: "da06", name: "Mozzarella", servingSize: 28, servingUnit: "g (1 oz)", calories: 85, protein: 6, carbs: 1, fat: 6, fiber: 0, sugar: 0, sodium: 178, category: "Dairy" },
  { id: "da07", name: "Cream Cheese", servingSize: 29, servingUnit: "g (2 tbsp)", calories: 101, protein: 2, carbs: 2, fat: 10, fiber: 0, sugar: 1, sodium: 92, category: "Dairy" },
  { id: "da08", name: "Butter, Unsalted", servingSize: 14, servingUnit: "g (1 tbsp)", calories: 102, protein: 0, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 2, category: "Dairy" },
  { id: "da09", name: "Heavy Cream", servingSize: 15, servingUnit: "ml (1 tbsp)", calories: 52, protein: 0, carbs: 0, fat: 6, fiber: 0, sugar: 0, sodium: 6, category: "Dairy" },
  { id: "da10", name: "Parmesan Cheese", servingSize: 5, servingUnit: "g (1 tbsp)", calories: 22, protein: 2, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 79, category: "Dairy" },

  // ─── FRUITS ───
  { id: "fr01", name: "Banana, Medium", servingSize: 118, servingUnit: "g (1 medium)", calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3, sugar: 14, sodium: 1, category: "Fruits" },
  { id: "fr02", name: "Apple, Medium", servingSize: 182, servingUnit: "g (1 medium)", calories: 95, protein: 1, carbs: 25, fat: 0, fiber: 4, sugar: 19, sodium: 2, category: "Fruits" },
  { id: "fr03", name: "Orange, Medium", servingSize: 131, servingUnit: "g (1 medium)", calories: 62, protein: 1, carbs: 15, fat: 0, fiber: 3, sugar: 12, sodium: 0, category: "Fruits" },
  { id: "fr04", name: "Blueberries", servingSize: 148, servingUnit: "g (1 cup)", calories: 84, protein: 1, carbs: 21, fat: 1, fiber: 4, sugar: 15, sodium: 1, category: "Fruits" },
  { id: "fr05", name: "Strawberries", servingSize: 152, servingUnit: "g (1 cup)", calories: 49, protein: 1, carbs: 12, fat: 1, fiber: 3, sugar: 7, sodium: 2, category: "Fruits" },
  { id: "fr06", name: "Grapes", servingSize: 151, servingUnit: "g (1 cup)", calories: 104, protein: 1, carbs: 27, fat: 0, fiber: 1, sugar: 23, sodium: 3, category: "Fruits" },
  { id: "fr07", name: "Mango", servingSize: 165, servingUnit: "g (1 cup)", calories: 99, protein: 1, carbs: 25, fat: 1, fiber: 3, sugar: 23, sodium: 2, category: "Fruits" },
  { id: "fr08", name: "Watermelon", servingSize: 152, servingUnit: "g (1 cup)", calories: 46, protein: 1, carbs: 12, fat: 0, fiber: 1, sugar: 9, sodium: 2, category: "Fruits" },
  { id: "fr09", name: "Pineapple", servingSize: 165, servingUnit: "g (1 cup)", calories: 82, protein: 1, carbs: 22, fat: 0, fiber: 2, sugar: 16, sodium: 2, category: "Fruits" },
  { id: "fr10", name: "Avocado", servingSize: 150, servingUnit: "g (1 medium)", calories: 240, protein: 3, carbs: 13, fat: 22, fiber: 10, sugar: 0, sodium: 10, category: "Fruits" },

  // ─── VEGETABLES ───
  { id: "vg01", name: "Broccoli, Raw", servingSize: 91, servingUnit: "g (1 cup)", calories: 31, protein: 3, carbs: 6, fat: 0, fiber: 2, sugar: 2, sodium: 30, category: "Vegetables" },
  { id: "vg02", name: "Baby Spinach", servingSize: 30, servingUnit: "g (1 cup)", calories: 7, protein: 1, carbs: 1, fat: 0, fiber: 1, sugar: 0, sodium: 24, category: "Vegetables" },
  { id: "vg03", name: "Kale, Raw", servingSize: 67, servingUnit: "g (1 cup)", calories: 34, protein: 3, carbs: 7, fat: 1, fiber: 1, sugar: 0, sodium: 53, category: "Vegetables" },
  { id: "vg04", name: "Carrots, Raw", servingSize: 128, servingUnit: "g (1 cup)", calories: 52, protein: 1, carbs: 12, fat: 0, fiber: 4, sugar: 6, sodium: 88, category: "Vegetables" },
  { id: "vg05", name: "Bell Pepper, Red", servingSize: 149, servingUnit: "g (1 medium)", calories: 31, protein: 1, carbs: 8, fat: 0, fiber: 3, sugar: 5, sodium: 4, category: "Vegetables" },
  { id: "vg06", name: "Cucumber", servingSize: 119, servingUnit: "g (1 cup sliced)", calories: 16, protein: 1, carbs: 4, fat: 0, fiber: 1, sugar: 2, sodium: 2, category: "Vegetables" },
  { id: "vg07", name: "Tomato, Medium", servingSize: 123, servingUnit: "g (1 medium)", calories: 22, protein: 1, carbs: 5, fat: 0, fiber: 2, sugar: 3, sodium: 6, category: "Vegetables" },
  { id: "vg08", name: "Romaine Lettuce", servingSize: 47, servingUnit: "g (1 cup)", calories: 8, protein: 1, carbs: 2, fat: 0, fiber: 1, sugar: 1, sodium: 4, category: "Vegetables" },
  { id: "vg09", name: "Green Beans, Cooked", servingSize: 125, servingUnit: "g (1 cup)", calories: 44, protein: 2, carbs: 10, fat: 0, fiber: 4, sugar: 5, sodium: 1, category: "Vegetables" },
  { id: "vg10", name: "Asparagus, Cooked", servingSize: 90, servingUnit: "g (½ cup)", calories: 20, protein: 2, carbs: 4, fat: 0, fiber: 2, sugar: 2, sodium: 13, category: "Vegetables" },

  // ─── LEGUMES ───
  { id: "lg01", name: "Black Beans, Cooked", servingSize: 172, servingUnit: "g (1 cup)", calories: 227, protein: 15, carbs: 41, fat: 1, fiber: 15, sugar: 1, sodium: 2, category: "Legumes" },
  { id: "lg02", name: "Lentils, Cooked", servingSize: 198, servingUnit: "g (1 cup)", calories: 230, protein: 18, carbs: 40, fat: 1, fiber: 16, sugar: 4, sodium: 4, category: "Legumes" },
  { id: "lg03", name: "Chickpeas, Cooked", servingSize: 164, servingUnit: "g (1 cup)", calories: 269, protein: 15, carbs: 45, fat: 4, fiber: 13, sugar: 8, sodium: 11, category: "Legumes" },
  { id: "lg04", name: "Edamame, Shelled", servingSize: 155, servingUnit: "g (1 cup)", calories: 188, protein: 18, carbs: 14, fat: 8, fiber: 8, sugar: 3, sodium: 9, category: "Legumes" },
  { id: "lg05", name: "Kidney Beans, Cooked", servingSize: 177, servingUnit: "g (1 cup)", calories: 225, protein: 15, carbs: 40, fat: 1, fiber: 11, sugar: 1, sodium: 3, category: "Legumes" },

  // ─── SNACKS ───
  { id: "sn01", name: "Almonds", servingSize: 28, servingUnit: "g (1 oz / ~23)", calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 4, sugar: 1, sodium: 0, category: "Snacks" },
  { id: "sn02", name: "Peanuts", servingSize: 28, servingUnit: "g (1 oz)", calories: 161, protein: 7, carbs: 5, fat: 14, fiber: 2, sugar: 1, sodium: 5, category: "Snacks" },
  { id: "sn03", name: "Peanut Butter", servingSize: 32, servingUnit: "g (2 tbsp)", calories: 188, protein: 8, carbs: 7, fat: 16, fiber: 2, sugar: 3, sodium: 147, category: "Snacks" },
  { id: "sn04", name: "Dark Chocolate 70%", servingSize: 28, servingUnit: "g (1 oz)", calories: 155, protein: 2, carbs: 16, fat: 11, fiber: 2, sugar: 7, sodium: 5, category: "Snacks" },
  { id: "sn05", name: "Protein Bar", servingSize: 63, servingUnit: "g (1 bar)", calories: 200, protein: 20, carbs: 22, fat: 7, fiber: 3, sugar: 8, sodium: 150, category: "Snacks" },
  { id: "sn06", name: "Granola Bar", servingSize: 47, servingUnit: "g (1 bar)", calories: 193, protein: 3, carbs: 30, fat: 8, fiber: 1, sugar: 13, sodium: 92, category: "Snacks" },
  { id: "sn07", name: "Pretzels", servingSize: 28, servingUnit: "g (1 oz)", calories: 108, protein: 3, carbs: 23, fat: 1, fiber: 1, sugar: 1, sodium: 385, category: "Snacks" },
  { id: "sn08", name: "Air-Popped Popcorn", servingSize: 28, servingUnit: "g (~3 cups)", calories: 110, protein: 4, carbs: 23, fat: 1, fiber: 4, sugar: 0, sodium: 1, category: "Snacks" },
  { id: "sn09", name: "Trail Mix", servingSize: 30, servingUnit: "g (small handful)", calories: 140, protein: 4, carbs: 12, fat: 9, fiber: 2, sugar: 7, sodium: 45, category: "Snacks" },
  { id: "sn10", name: "Cashews", servingSize: 28, servingUnit: "g (1 oz)", calories: 157, protein: 5, carbs: 9, fat: 12, fiber: 1, sugar: 2, sodium: 3, category: "Snacks" },

  // ─── BEVERAGES ───
  { id: "bv01", name: "Orange Juice", servingSize: 240, servingUnit: "ml (1 cup)", calories: 112, protein: 2, carbs: 26, fat: 1, fiber: 1, sugar: 21, sodium: 2, category: "Beverages" },
  { id: "bv02", name: "Apple Juice", servingSize: 240, servingUnit: "ml (1 cup)", calories: 114, protein: 0, carbs: 28, fat: 0, fiber: 1, sugar: 24, sodium: 10, category: "Beverages" },
  { id: "bv03", name: "Sports Drink", servingSize: 240, servingUnit: "ml (1 cup)", calories: 50, protein: 0, carbs: 14, fat: 0, fiber: 0, sugar: 14, sodium: 110, category: "Beverages" },
  { id: "bv04", name: "Coconut Water", servingSize: 240, servingUnit: "ml (1 cup)", calories: 46, protein: 2, carbs: 9, fat: 1, fiber: 3, sugar: 6, sodium: 252, category: "Beverages" },
  { id: "bv05", name: "Unsweetened Almond Milk", servingSize: 240, servingUnit: "ml (1 cup)", calories: 39, protein: 1, carbs: 4, fat: 3, fiber: 1, sugar: 2, sodium: 186, category: "Beverages" },
];

export default FOODS;

export function searchFoods(query: string, limit = 20): FoodItem[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return FOODS.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
  ).slice(0, limit);
}

export function getFoodById(id: string): FoodItem | undefined {
  return FOODS.find((f) => f.id === id);
}
