
## To assign layers to each row :
1. Open file system_config.xlsx., sheet 'Layers'
2. In column 'ViewRoles' add :
admin
admin,editor
[blank] = all can view

## For local admin :
document.cookie = 'auth_role=admin; path=/';


## To use view snapshot. Here's how to use it:
1. Open the app → 8 small buttons appear at the top of the 3D canvas (all dimmed/numbered since no presets yet)
2. Set up the scene you want (move camera, set floor, toggle layers, etc.)
3. Click 📷 → clipboard gets a tab-separated row
4. Open assets/scene_presets.xlsx → paste the row → fill in id (1–8), label, tooltip → save
5. Reload the app → the configured buttons are now active

## To set multi form name
Setup in Excel: Add Name1 and/or Name2 columns to your form layer sheets (e.g. the form_can_1 sheet in the floor data file). Fill in the alternate names for each item.

In the app: Any form layer that has Name1/Name2 data will show a small N button in the left panel after the layer name. Clicking it:

N → N1: labels spin and show Name1
N1 → N2: labels spin and show Name2
N2 → N: labels spin back to original Name

The cycle button only appears on layers that actually have the extra name columns — other layers are unaffected.