class MenuPanel {
    constructor(panelId, openId, closeId, fullscreen) {
        this.panelId = panelId;
        this.openId = openId;
        this.closeId = closeId;
        this.fullscreen = fullscreen;
        this.initialize();
    }
    
    initialize() {
        this.panel = document.getElementById(this.panelId);
        
        this.openBtn = document.getElementById(this.openId);
        this.openBtn.addEventListener("click", this.open.bind(this), false);
        
        this.closeBtn = document.getElementById(this.closeId);
        this.closeBtn.addEventListener("click", this.close.bind(this), false);
    }

    open() {
        this.panel.classList.add('expand-horizontal');
        this.panel.classList.remove('collapsed-horizontal');
        this.openBtn.classList.add('collapsed-horizontal');
        this.openBtn.classList.remove('expand-horizontal');
        this.otherMenu.close();
    }
        
    close() {
        this.panel.classList.remove('expand-horizontal');
        this.panel.classList.add('collapsed-horizontal');
        this.openBtn.classList.remove('collapsed-horizontal');
        this.openBtn.classList.add('expand-horizontal');
    }
        
    static createToggle(layerDef, handler) {
        const toggle = document.createElement('div');
            toggle.classList.add('btn-toggle');
            
        const toggleCb = document.createElement('input');
            toggleCb.setAttribute("type", "checkbox");
            toggleCb.id = 'toggle-' + layerDef.id;
            toggleCb.addEventListener("change", handler, false);
        toggle.appendChild(toggleCb);

        const toggleLbl = document.createElement('label');
            toggleLbl.setAttribute("for", toggleCb.id);
        toggle.appendChild(toggleLbl);
        
        return toggle;
    }

    static createMenuPanelItem(InteractiveMap, layerDef, handler, inputType, inputName) {
        let optionId = layerDef.id;
        
        const menuItem = document.createElement('div');
            menuItem.classList.add('menu-item');
            menuItem.classList.add(inputName || 'data-layer');
            
        const menuItemCb = document.createElement('input');
            menuItemCb.setAttribute("type", inputType || "checkbox");
            if (inputType == "radio") {
                optionId = layerDef.group + '-' + layerDef.id;
                menuItemCb.setAttribute("name", inputName);
                menuItemCb.setAttribute("value", optionId);
            }
            menuItemCb.id = 'option-' + optionId;
            menuItemCb.setAttribute("data-layer-id", optionId);
            menuItemCb.addEventListener("change", handler, false);
        menuItem.appendChild(menuItemCb);
        
        const menuItemLbl = document.createElement('label');
            menuItemLbl.classList.add('checkbox');
            menuItemLbl.setAttribute("for", menuItemCb.id);
            menuItemLbl.innerHTML = layerDef.name;
        menuItem.appendChild(menuItemLbl);
        
        if (layerDef.toggle) {
            const toggle = MenuPanel.createToggle(layerDef, e => {
                const el = e.currentTarget;
                const layer = InteractiveMap.getMapLayer(layerDef.id);
                if (layerDef.id == 'ent_dota_tree') {
                    InteractiveMap.treeControl.toggleAllTrees(el.checked);
                }
                else {
                    InteractiveMap.wardControl.toggleAll(layer, el.checked);
                }
            });
            menuItem.appendChild(toggle);
        }
        
        return menuItem;
    }
}

class MenuControl {
    constructor(InteractiveMap) {
        this.InteractiveMap = InteractiveMap;
        this.leftPanel = new MenuPanel("menu-left", "menu-left-open-btn", "menu-left-close-btn");
        this.rightPanel = new MenuPanel("menu-right", "menu-right-open-btn", "menu-right-close-btn");
        this.leftPanel.otherMenu = this.rightPanel;
        this.rightPanel.otherMenu = this.leftPanel;
    }
    
    initialize(layerToggleHandler, baseLayerToggleHandler) {
        this.InteractiveMap.layerDefs.forEach(layerDef => {
            const group = layerDef.group;
            const menu = document.querySelector('#' + group + '-menu');
            const menuItem = MenuPanel.createMenuPanelItem(this.InteractiveMap, layerDef, layerToggleHandler);
            menu.appendChild(menuItem);
        });

        this.InteractiveMap.baseLayerDefs.forEach(layerDef => {
            const group = layerDef.group;
            const menu = document.querySelector('#base-' + group + '-menu');
            const menuItem = MenuPanel.createMenuPanelItem(this.InteractiveMap, layerDef, baseLayerToggleHandler, 'radio', 'base-layer');
            menu.appendChild(menuItem);
        });
    }

}

export default MenuControl;