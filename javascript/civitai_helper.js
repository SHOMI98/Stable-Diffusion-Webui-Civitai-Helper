(function() {

"use strict";

let replace_preview_text = '';
let ch_always_display_ckb;

function ch_convert_file_path_to_url(path){
    let prefix = "file=";
    let path_to_url = path.replaceAll('\\', '/');
    return prefix+path_to_url;
}

function ch_img_node_str(path) {
    return `<img src='${ch_convert_file_path_to_url(path)}' style="width:24px"/>`;
}

function ch_gradio_version() {
    let foot = gradioApp().getElementById("footer");
    if (!foot){return null;}

    let versions = foot.querySelector(".versions");
    if (!versions){return null;}

    if (versions.textContent.indexOf("gradio: 3.16.2")>0) {
        return "3.16.2";
    } else {
        return "3.23.0";
    }

}


// send msg to python side by filling a hidden text box
// then will click a button to trigger an action
// msg is an object, not a string, will be stringify in this function
function send_ch_py_msg(msg) {
    console.log("run send_ch_py_msg");
    let js_msg_txtbox = gradioApp().querySelector("#ch_js_msg_txtbox textarea");
    if (js_msg_txtbox && msg) {
        // fill to msg box
        js_msg_txtbox.value = JSON.stringify(msg);
        js_msg_txtbox.dispatchEvent(new Event("input"));
    }

}

// get msg from python side from a hidden textbox
// normally this is an old msg, need to wait for a new msg
function get_ch_py_msg() {
    console.log("run get_ch_py_msg");
    const py_msg_txtbox = gradioApp().querySelector("#ch_py_msg_txtbox textarea");
    if (py_msg_txtbox && py_msg_txtbox.value) {
        console.log("find py_msg_txtbox");
        console.log("py_msg_txtbox value: ", py_msg_txtbox.value);
        return py_msg_txtbox.value;
    } else {
        return "";
    }
}


// get msg from python side from a hidden textbox
// it will try once in every sencond, until it reach the max try times
const get_new_ch_py_msg = (max_count=3) => new Promise((resolve, reject) => {
    console.log("run get_new_ch_py_msg");

    let count = 0;
    let new_msg = "";
    let find_msg = false;
    const interval = setInterval(() => {
        const py_msg_txtbox = gradioApp().querySelector("#ch_py_msg_txtbox textarea");
        count++;

        if (py_msg_txtbox && py_msg_txtbox.value) {
            console.log("find py_msg_txtbox");
            console.log("py_msg_txtbox value: ", py_msg_txtbox.value);

            new_msg = py_msg_txtbox.value;
            if (new_msg != "") {
                find_msg = true;
            }
        }

        if (find_msg) {
            //clear msg in both sides
            py_msg_txtbox.value = "";
            py_msg_txtbox.dispatchEvent(new Event("input"));

            resolve(new_msg);
            clearInterval(interval);
        } else if (count > max_count) {
            //clear msg in both sides
            py_msg_txtbox.value = "";
            py_msg_txtbox.dispatchEvent(new Event("input"));

            reject('');
            clearInterval(interval);
        }

    }, 1000);
});


function getActiveTabType() {
    const currentTab = get_uiCurrentTabContent();
    switch (currentTab.id) {
        case "tab_txt2img":
            return "txt2img";
        case "tab_img2img":
            return "img2img";
    }
    return null;
}

function getExtraTabs(prefix) {
    return gradioApp().getElementById(prefix + "_extra_tabs");
}

function getActivePrompt() {
    const currentTab = get_uiCurrentTabContent();
    switch (currentTab.id) {
        case "tab_txt2img":
            return currentTab.querySelector("#txt2img_prompt textarea");
        case "tab_img2img":
            return currentTab.querySelector("#img2img_prompt textarea");
    }
    return null;
}

function getActiveNegativePrompt() {
    const currentTab = get_uiCurrentTabContent();
    switch (currentTab.id) {
        case "tab_txt2img":
            return currentTab.querySelector("#txt2img_neg_prompt textarea");
        case "tab_img2img":
            return currentTab.querySelector("#img2img_neg_prompt textarea");
    }
    return null;
}


//button's click function
async function open_model_url(event, model_type, search_term){
    console.log("start open_model_url");

    //get hidden components of extension
    let js_open_url_btn = gradioApp().getElementById("ch_js_open_url_btn");
    if (!js_open_url_btn) {
        return;
    }


    //msg to python side
    let msg = {
        action: "",
        model_type: "",
        search_term: "",
        prompt: "",
        neg_prompt: "",
    };


    msg.action = "open_url";
    msg.model_type = model_type;
    msg.search_term = search_term;
    msg.prompt = "";
    msg.neg_prompt = "";

    // fill to msg box
    send_ch_py_msg(msg);

    //click hidden button
    js_open_url_btn.click();

    // stop parent event
    event.stopPropagation();
    event.preventDefault();

    //check response msg from python
    let new_py_msg = await get_new_ch_py_msg();
    console.log("new_py_msg: ", new_py_msg);

    //check msg
    if (new_py_msg) {
        let py_msg_json = JSON.parse(new_py_msg);
        //check for url
        if (py_msg_json && py_msg_json.content) {
            if (py_msg_json.content.url) {
                window.open(py_msg_json.content.url, "_blank");
            }

        }


    }


    console.log("end open_model_url");
}


function add_trigger_words(event, model_type, search_term){
    console.log("start add_trigger_words");

    //get hidden components of extension
    let js_add_trigger_words_btn = gradioApp().getElementById("ch_js_add_trigger_words_btn");
    if (!js_add_trigger_words_btn) {
        return;
    }


    //msg to python side
    let msg = {
        action: "",
        model_type: "",
        search_term: "",
        prompt: "",
        neg_prompt: "",
    };

    msg.action = "add_trigger_words";
    msg.model_type = model_type;
    msg.search_term = search_term;
    msg.neg_prompt = "";

    // get active prompt
    let act_prompt = getActivePrompt();
    msg.prompt = act_prompt.value;

    // fill to msg box
    send_ch_py_msg(msg);

    //click hidden button
    js_add_trigger_words_btn.click();

    console.log("end add_trigger_words");

    event.stopPropagation();
    event.preventDefault();
}


function use_preview_prompt(event, model_type, search_term){
    console.log("start use_preview_prompt");

    //get hidden components of extension
    let js_use_preview_prompt_btn = gradioApp().getElementById("ch_js_use_preview_prompt_btn");
    if (!js_use_preview_prompt_btn) {
        return;
    }

    //msg to python side
    let msg = {
        action: "",
        model_type: "",
        search_term: "",
        prompt: "",
        neg_prompt: "",
    };

    msg.action = "use_preview_prompt";
    msg.model_type = model_type;
    msg.search_term = search_term;

    // get active prompt
    let act_prompt = getActivePrompt();
    msg.prompt = act_prompt.value;

    // get active neg prompt
    let neg_prompt = getActiveNegativePrompt();
    msg.neg_prompt = neg_prompt.value;

    // fill to msg box
    send_ch_py_msg(msg);

    //click hidden button
    js_use_preview_prompt_btn.click();

    console.log("end use_preview_prompt");

    event.stopPropagation();
    event.preventDefault();
}


// download model's new version into SD at python side
function ch_dl_model_new_version(event, model_path, version_id, download_url){
    console.log("start ch_dl_model_new_version");

    // must confirm before downloading
    let dl_confirm = "\nConfirm to download.\n\nCheck Download Model Section's log and console log for detail.";
    if (!confirm(dl_confirm)) {
        return;
    }

    //get hidden components of extension
    let js_dl_model_new_version_btn = gradioApp().getElementById("ch_js_dl_model_new_version_btn");
    if (!js_dl_model_new_version_btn) {
        return;
    }

    //msg to python side
    let msg = {
        action: "",
        model_path: "",
        version_id: "",
        download_url: "",
    };

    msg.action = "dl_model_new_version";
    msg.model_path = model_path;
    msg.version_id = version_id;
    msg.download_url = download_url;

    // fill to msg box
    send_ch_py_msg(msg);

    //click hidden button
    js_dl_model_new_version_btn.click();

    console.log("end dl_model_new_version");

    event.stopPropagation();
    event.preventDefault();
}

function processCards(tab, extra_tab_els) {
    const prefix_length = tab.length + 1;
    for (const el of extra_tab_els) {
        const model_type = el.id.slice(prefix_length, -6);
        const cards = el.querySelectorAll('.card');
        for (const card of cards) {
            processSingleCard(tab, getShortModelTypeFromFull(model_type), card);
        }
    }
}


function getModelCardsEl(prefix, model_type) {
    const id = prefix + "_" + model_type + "_cards_html";
    return  gradioApp().getElementById(id);
}


function waitForExtraTabs(tab, extra_tabs) {
    function findTabs() {
        const tab_elements = [];
        for (const extra_tab of extra_tabs) {
            const extra_tab_el = getModelCardsEl(tab, extra_tab);

            if (extra_tab_el == null) {

                // XXX lycoris models do not have their own tab in sdwebui 1.5
                // most of the time. In the case that there is a LyCoris tab,
                // it would have been added at the same time as the others,
                // making it almost impossible to be null by the time we're at
                // this point in the code if the other tabs are loaded.
                if (extra_tab == 'lycoris') { continue; }

                return null;
            }

            tab_elements.push(extra_tab_el);
        }
        return tab_elements;
    }

    const tab_elements = findTabs(tab, extra_tabs);
    if (tab_elements) {
        processCards(tab, tab_elements);
    }

    const observer = new MutationObserver(records => {
        let tab_elements;
        for (const record of records) {
            if (record.type != "childList") {
                continue;
            }

            tab_elements = findTabs(tab, extra_tabs);
            if (!tab_elements) {
                return;
            }

            processCards(tab, tab_elements);
            return;
        }
    });

    const extra_networks = getExtraTabs(tab);

    const options = {
        subtree: true,
        childList: true,
    };

    observer.observe(extra_networks, options);
}


function waitForEditor(page, type, name) {
    const id = page + '_' + type + '_edit_user_metadata';

    return new Promise(resolve => {
        let name_field;
        const gradio = gradioApp();

        const editor = gradio.getElementById(id);
        const popup = gradio.querySelector(".global-popup");

        if (popup != null) {
            // hide the editor window so it doesn't get in the user's
            // way while we wait for the replace preview functionality
            // to become available.
            popup.style.display = "none";
        }

        // not only do we need to wait for the editor,
        // but also for it to populate with the model metadata.
        if (editor != null) {
            name_field = editor.querySelector('.extra-network-name');
            if (name_field.textContent.trim() == name) {
                return resolve(editor);
            }
        }

        const observer = new MutationObserver(() => {
            const editor = gradioApp().getElementById(id);
            let name_field;
            if (editor != null) {
                name_field = editor.querySelector('.extra-network-name');
                if (name_field.textContent.trim() == name) {
                    resolve(editor);
                    observer.disconnect();
                }
            }
        });

        observer.observe(document.body, {
            subtree: true,
            childList: true,
        });
    });
}


function getShortModelTypeFromFull(model_type_full) {
    switch (model_type_full) {
        case "textual_inversion":
            return "ti";
        case "hypernetworks":
            return "hyper";
        case "checkpoints":
            return "ckp";
        case "lora":
        case "lycoris":
            return model_type_full;
    }
}


function getLongModelTypeFromShort(model_type_short) {
    switch (model_type_short) {
        case "ti":
            return "textual_inversion";
        case "hyper":
            return "hypernetworks";
        case "ckp":
            return "checkpoints";
        case "lora":
        case "lycoris":
            return model_type_short;
    }
}

const buttons = {
    replace_preview: '🖼️',
    open_url: '🌐',
    add_trigger_words: '💡',
    use_preview_prompt: '🏷️'
};

const createUI = (function() {
    let assignStyle = (el, el_thm) => {
        //css
        const btn_margin = "0px 5px";
        const btn_fontSize = "200%";

        el.style.fontSize = btn_fontSize;
        el.style.margin = btn_margin;
    };

    let ul_node;
    let ul_node_tm;

    { // shitty lexical scope hack to avoid accidental closure inheritence.

        let appendChildren = function(parent, els) {
            for (const el of els) {
                parent.appendChild(el);
            }
        };

        // default mode
        let replace_preview_btn;
        let open_url_node;
        let add_trigger_words_node;
        let use_preview_prompt_node;

        let template = document.createElement("a");
        template.href = "#";

        ul_node = document.createElement('ul');

        replace_preview_btn = template.cloneNode();
        replace_preview_btn.textContent = buttons.replace_preview;

        open_url_node = template.cloneNode();
        open_url_node.textContent = buttons.open_url;
        open_url_node.className = "openurl";
        open_url_node.title = "Open this model's civitai url";

        add_trigger_words_node = template.cloneNode();
        add_trigger_words_node.textContent = buttons.add_trigger_words;
        add_trigger_words_node.className = "addtriggerwords";
        add_trigger_words_node.title = "Add trigger words to prompt";

        use_preview_prompt_node = template.cloneNode();
        use_preview_prompt_node.textContent = buttons.use_preview_prompt;
        use_preview_prompt_node.className = "usepreviewprompt";
        use_preview_prompt_node.title = "Use prompt from preview image";

        assignStyle(replace_preview_btn,);
        assignStyle(open_url_node,);
        assignStyle(add_trigger_words_node,);
        assignStyle(use_preview_prompt_node,);

        //add to card
        appendChildren(ul_node, [
            replace_preview_btn,
            open_url_node,
            add_trigger_words_node,
            use_preview_prompt_node
        ]);

    }

    let createUI = function() {
        let el = ul_node.cloneNode(true);
        let children = el.children;

        return {
            ul:                    el,
            replace_preview:       children[0],
            open_url:              children[1],
            add_trigger_words:     children[2],
            use_preview_prompt:    children[3],
        };
    };

    createUI.assignStyle = assignStyle;

    return createUI;
})();

function processSingleCard(active_tab_type, active_extra_tab_type, card) {
    let metadata_button = null;
    let additional_node = null;
    let ul_node = null
    let replace_preview_btn = null;
    let search_term_node = null;
    let search_term = "";

    if(card.querySelector(".actions .additional ul") != null) {
        // buttons have already been added to this card.
        return;
    }

    const model_type = active_extra_tab_type;
    const js_model_type = getLongModelTypeFromShort(model_type);

    let open_url_node;
    let add_trigger_words_node;
    let use_preview_prompt_node;

    //metadata_buttoncard
    metadata_button = card.querySelector(".metadata-button");

    //additional node
    additional_node = card.querySelector(".actions .additional");

    const nodes = createUI();
    ul_node = nodes.ul;

    {
        // waste memory by keeping all of this in scope, per card.
        const page = active_tab_type;
        const type = js_model_type;
        const name = card.dataset.name;

        // create the replace_preview_btn, as it no longer exists
        replace_preview_btn = nodes.replace_preview;

        // create an event handler to redirect a click to the real replace_preview_button
        replace_preview_btn.addEventListener("click", function(e) {
            // we have to create a whole hidden editor window to access preview replace functionality
            extraNetworksEditUserMetadata(e, page, type, name);

            // the editor window takes quite some time to populate. What a waste.
            waitForEditor(page, type, name).then(editor => {
                // Gather the buttons we need to both replace the preview and close the editor
                const editor_cancel_button = editor.querySelector('.edit-user-metadata-buttons button:first-of-type');
                const editor_replace_preview_button = editor.querySelector('.edit-user-metadata-buttons button:nth-of-type(2)');

                editor_replace_preview_button.click();
                editor_cancel_button.click();
            });
        });
    }

    const ch_always_display_ckb = gradioApp().querySelector("#ch_always_display_ckb input");
    const ch_always_display = ch_always_display_ckb ? ch_always_display_ckb.checked : false;

    additional_node.style.display = ch_always_display ? "block" : null;

    // search_term node
    // search_term = subfolder path + model name + ext
    search_term_node = card.querySelector(".actions .additional .search_term");
    if (!search_term_node){
        console.log("can not find search_term node for cards in " + active_tab_type + "_" + active_extra_tab_type + "_cards");
        return;
    }

    open_url_node =             nodes.open_url;
    add_trigger_words_node =    nodes.add_trigger_words;
    use_preview_prompt_node =   nodes.use_preview_prompt;

    // get search_term
    search_term = search_term_node.textContent;
    if (!search_term) {
        console.log("search_term is empty for cards in " + active_tab_type + "_" + active_extra_tab_type + "_cards");
        return;
    }

    open_url_node.addEventListener('click', e => {
        open_model_url(e, model_type, search_term);
    });

    add_trigger_words_node.addEventListener('click', e => {
        add_trigger_words(e, model_type, search_term);
    });

    use_preview_prompt_node.addEventListener('click', e => {
        use_preview_prompt(e, model_type, search_term);
    });

    additional_node.appendChild(ul_node);

}

onUiLoaded(() => {
    //get gradio version
    const gradio_ver = ch_gradio_version();
    console.log("Running Stable-Diffusion-Webui-Civitai-Helper on Gradio Version: " + gradio_ver);

    // get all extra network tabs
    const tab_prefix_list = ["txt2img", "img2img"];
    const model_type_list = ["textual_inversion", "hypernetworks", "checkpoints", "lora", "lycoris"];

    // update extra network tab pages' cards
    // * replace "replace preview" text button into the icon from `buttons.replace_preview`.
    // * add 3 button to each card:
    //  - open model url:               `buttons.open_url`
    //  - add trigger words:            `buttons.add_trigger_words`
    //  - use preview image's prompt    `buttons.use_preview_prompt`
    //
    // notice: javascript can not get response from python side
    // so, these buttons just sent request to python
    // then, python side gonna open url and update prompt text box, without telling js side.
    function update_card_for_civitai(){
        replace_preview_text = getTranslation("replace preview");

        if (!replace_preview_text) {
            replace_preview_text = "replace preview";
        }

        ch_always_display_ckb = gradioApp().querySelector("#ch_always_display_ckb input");

        let extra_network_node = null;
        let model_type = "";
        let cards = null;

        //get current tab
        let active_tab_type = getActiveTabType();
        if (!active_tab_type) {active_tab_type = "txt2img";}

        for (const tab_prefix of tab_prefix_list) {
            if (tab_prefix != active_tab_type) {
                continue;
            }


            //find out current selected model type tab
            const extra_tabs = getExtraTabs(tab_prefix);

            //get active extratab
            const re = new RegExp(tab_prefix + "_(.+)_cards_html$");
            const active_extra_tab = Array.from(get_uiCurrentTabContent().querySelectorAll('.extra-network-cards'))
                .find(el => el.closest('.tabitem').style.display === 'block')
                ?.id.match(re)[1];

            const active_extra_tab_type = getShortModelTypeFromFull(active_extra_tab);

            for (const js_model_type of model_type_list) {
                //get model_type for python side
                model_type = getShortModelTypeFromFull(js_model_type);

                if (!model_type) {
                    console.log("can not get model_type from: " + js_model_type);
                    continue;
                }


                //only handle current sub-tab
                if (model_type != active_extra_tab_type) {
                    continue;
                }

                extra_network_node = getModelCardsEl(tab_prefix, js_model_type);

                // get all card nodes
                cards = extra_network_node.querySelectorAll(".card");
                for (const card of cards) {
                    processSingleCard(active_tab_type, active_extra_tab_type, card);
                }

            }

        }

    }

    let extra_tab = null;
    let extra_networks_btn = null;

    //add refresh button to extra network's toolbar
    for (const prefix of tab_prefix_list) {
        const extra_tab = getExtraTabs(prefix);
        const headers = extra_tab.firstChild.children;

        for (const header of headers) {
            const model_type = header.textContent.trim().replace(" ", "_").toLowerCase();

            let extraNetworksClick = e => {
                waitForExtraTabs(prefix, [model_type]);
                header.removeEventListener("click", extraNetworksClick);
            }

            header.addEventListener('click', extraNetworksClick);
        }
    }


    //run it once
    update_card_for_civitai();

});})();


