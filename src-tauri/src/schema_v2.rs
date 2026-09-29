use crate::schema::{color, number, valid_id};
use serde_json::{json, Value};
use std::collections::HashSet;

fn list<'a>(v: &'a Value, key: &str, limit: usize) -> Result<&'a Vec<Value>, String> {
    let result = v[key].as_array().ok_or(format!("Invalid {key}"))?;
    if result.len() > limit {
        return Err(format!("Too many {key}"));
    }
    Ok(result)
}
fn ids(items: &[Value]) -> Result<HashSet<&str>, String> {
    let mut result = HashSet::new();
    for item in items {
        let id = item["id"]
            .as_str()
            .filter(|s| valid_id(s))
            .ok_or("Invalid identifier")?;
        if !result.insert(id) {
            return Err("Duplicate identifier".into());
        }
    }
    Ok(result)
}
fn material_ref(v: &Value, materials: &HashSet<&str>) -> Result<(), String> {
    if !v["materialId"].is_null() && !materials.contains(v["materialId"].as_str().unwrap_or("")) {
        return Err("Unknown material".into());
    }
    Ok(())
}
fn regions(v: &Value, key: &str) -> Result<(), String> {
    let items = list(v, key, 100)?;
    ids(items)?;
    for r in items {
        for axis in ["x", "y", "width", "height"] {
            number(r, axis, 0.0, 1.0)?;
        }
        if r["width"].as_f64().unwrap() <= 0.0
            || r["height"].as_f64().unwrap() <= 0.0
            || r["x"].as_f64().unwrap() + r["width"].as_f64().unwrap() > 1.000001
            || r["y"].as_f64().unwrap() + r["height"].as_f64().unwrap() > 1.000001
        {
            return Err("Region exceeds normalized canvas bounds".into());
        }
    }
    Ok(())
}
fn range(v: &Value, key: &str, min: f64, max: f64) -> Result<(), String> {
    let values = v[key].as_array().ok_or(format!("Invalid {key} range"))?;
    if values.len() != 2 {
        return Err(format!("Invalid {key} range"));
    }
    let low = values[0].as_f64().ok_or("Invalid range number")?;
    let high = values[1].as_f64().ok_or("Invalid range number")?;
    if low < min || high > max || low > high {
        return Err(format!("Invalid {key} range"));
    }
    if key == "count" && (low.fract() != 0.0 || high.fract() != 0.0) {
        return Err("Counts must be integers".into());
    }
    Ok(())
}
fn document(v: &Value, assets: &Value, materials: &HashSet<&str>) -> Result<(), String> {
    crate::schema::validate(
        &json!({"version":1,"id":"validation","name":"validation","template":v["template"],"elements":v["elements"],"assets":assets}),
    )?;
    regions(v, "protectedZones")?;
    material_ref(v, materials)
}
fn profile(
    v: &Value,
    assets: &Value,
    asset_ids: &HashSet<&str>,
    materials: &HashSet<&str>,
) -> Result<(), String> {
    crate::schema::validate(
        &json!({"version":1,"id":"validation","name":"validation","template":v["template"],"elements":[],"assets":assets}),
    )?;
    material_ref(v, materials)?;
    if !v["protectContent"].is_boolean()
        || v["name"]
            .as_str()
            .filter(|s| !s.is_empty() && s.len() <= 512)
            .is_none()
    {
        return Err("Invalid generation profile".into());
    }
    let rules = list(v, "rules", 64)?;
    ids(rules)?;
    for r in rules {
        if !asset_ids.contains(r["assetId"].as_str().unwrap_or("")) {
            return Err("Unknown procedural asset".into());
        }
        for key in ["enabled", "flipX", "flipY"] {
            if !r[key].is_boolean() {
                return Err(format!("Invalid {key}"));
            }
        }
        number(r, "probability", 0.0, 1.0)?;
        number(r, "band", 0.01, 0.5)?;
        range(r, "count", 0.0, 50.0)?;
        range(r, "x", 0.0, 1.0)?;
        range(r, "y", 0.0, 1.0)?;
        range(r, "scale", 0.05, 8.0)?;
        range(r, "rotation", -360.0, 360.0)?;
        range(r, "opacity", 0.0, 1.0)?;
        if !["surface", "perimeter", "corners", "custom"]
            .contains(&r["zone"].as_str().unwrap_or(""))
        {
            return Err("Invalid distribution zone".into());
        }
        regions(r, "regions")?;
    }
    Ok(())
}
pub fn validate(p: &Value) -> Result<(), String> {
    let assets = p["assets"].as_array().ok_or("Invalid assets")?;
    let asset_ids = ids(assets)?;
    for asset in assets {
        if ![
            "materials",
            "textures",
            "illustrations",
            "creases",
            "grease",
            "dirt",
            "folds",
            "dents",
            "wear",
            "tape",
        ]
        .contains(&asset["category"].as_str().unwrap_or(""))
        {
            return Err("Invalid asset category".into());
        }
    }
    let materials = list(p, "materials", 500)?;
    let material_ids = ids(materials)?;
    for m in materials {
        if !asset_ids.contains(m["assetId"].as_str().unwrap_or("")) {
            return Err("Unknown material asset".into());
        }
        color(m, "color")?;
        number(m, "opacity", 0.0, 1.0)?;
    }
    regions(p, "protectedZones")?;
    material_ref(p, &material_ids)?;
    number(p, "seed", 0.0, 4294967295.0)?;
    let profiles = list(p, "profiles", 50)?;
    let profile_ids = ids(profiles)?;
    if !profile_ids.contains(p["activeProfileId"].as_str().unwrap_or("")) {
        return Err("Unknown active profile".into());
    }
    for v in profiles {
        profile(v, &p["assets"], &asset_ids, &material_ids)?;
    }
    let variants = list(p, "variants", 32)?;
    ids(variants)?;
    for v in variants {
        number(v, "seed", 0.0, 4294967295.0)?;
        document(v, &p["assets"], &material_ids)?;
        profile(&v["profile"], &p["assets"], &asset_ids, &material_ids)?;
    }
    Ok(())
}
