# Datacenter hall

The portfolio racks occupy the first three positions in a long equipment aisle. Software, hardware and experience remain the navigable content; the surrounding infrastructure gives those racks a physical setting.

## References inspected

- [Google Data Centers, New Albany photo gallery](https://www.datacenters.google/discover-more/photo-gallery/). Inspected the server-aisle, transparent-door and overhead-fibre photographs. The useful details were the repeated exposed equipment, substantial cabinet frames, suspended ladder trays and structural crossmembers, overhead cable routing, bright white service lighting and containment at aisle ends.
- [ENERGY STAR, hot aisle and cold aisle layout](https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/move-hot-aislecold-aisle-layout). Opposing equipment fronts and supply grilles along their edges establish the central cold aisle.

The geometry is original. Reference photographs are research material, not runtime assets. This is an illustrative portfolio environment, not an engineering layout or a replica of Google's installation.

## Construction

`datacenter.js` exports `createDatacenter({ floorY, rackHeight })`, returning `group`, `stats` and `dispose()`.

- Floor at `floorY`, default `-5.42`. Broad three-unit raised-floor tiles, supply grilles near the equipment fronts and a clear walking route.
- Two rows centred at `x = -8` and `x = 8`. Ambient cabinet centres repeat every six units along `z`, from `0` to `-48`.
- Three front-left positions, `z = 0`, `-6` and `-12`, stay empty for the interactive racks. Fifteen ambient cabinets fill the other positions.
- Ambient cabinets are six units deep, 4.92 units wide and 12.8 units high with the default rack height. Front faces point into the aisle. Mounted servers mix shallow faceplates and storage trays; removable end panels have visible seams and handles.
- Sixteen vertical cable-manager columns close the 1.08-unit spaces between cabinets. Covered fronts, latches and top caps leave narrow assembly seams. Columns beside the three portfolio racks use their shallower depth and lower height, without crossing the reserved rack envelopes.
- Overhead ladder trays have broad rungs, blue cable bundles and suspension rods. Repeated white fixtures hang between structural crossmembers. No green accents, blinking lights, bloom or fine perforation textures.
- The end portal sits at `z = -53.2`; opaque inset panels suggest glazing without transparency sorting or transmission cost.

Geometry is merged by material into ten meshes, totalling 36,072 triangles with the default dimensions. The module creates no lights, controls or raycast targets. The scene owns lighting and navigation. Only the floor receives shadows. Disposal releases every merged geometry and material, then clears the group.
