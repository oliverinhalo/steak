# steak
a way to track eating steaks.

# 🥩 Steak Tracker

A sleek and simple **steak tracking system** for monitoring **weight, cost, cook, photos, and steak type**.  
Built to help track value, quality, and changes over time — whether you're logging supermarket steaks or premium cuts.

---

## 🚀 Features

- 📸 **Photo logging** – attach images to each steak entry  
- ⚖️ **Weight tracking** – record weight before / after trimming or cooking  
- 🔥 **Cook data** - recored how cooked it was
- 💷 **Cost analysis** – price per steak and price per kg  
- 🥩 **Steak type** – ribeye, sirloin, rump, fillet, and more  
- 📊 **Data-focused** – perfect for comparisons and trends over time  

---

## 🧠 Why Steak Tracker?

Ever wondered:
- Which cut gives the **best value per kg**?
- How much **weight you lose** after trimming or cooking?
- Whether premium steaks are *actually* worth it?

Steak Tracker turns steak buying into **data**.

---

## 🗂️ Data Stored Per Steak

| Field | Description |
|------|------------|
| `type` | Steak cut (e.g. Ribeye, Sirloin) |
| `weight` | Weight in grams |
| `cost` | Purchase price |
| 'cook' | cook type (rare, well done) |
| `price_per_kg` | Automatically calculated |
| `photo` | Image of the steak |
| `date` | Date logged |

---

## 🛠️ Tech Stack

- **Language:** Python  
- **Storage:** JSON / SQLite (depending on setup)  
- **UI:** CLI / GUI / Web (project dependent)  
- **Photos:** Local file storage  

---

## 📦 Example Entry

```json
{
  "type": "Ribeye",
  "weight_g": 420,
  "cost_gbp": 6.50,
  "cook": "median rare",
  "price_per_kg": 15.48,
  "photo": "ribeye_2025-01-12.jpg",
  "date": "2025-01-12"
}
