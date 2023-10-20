/**
 * @file Handle element events
 * @name Events.ts
 * @license MIT
 */

const ListenerStore: Array<{
    element: HTMLElement;
    type: keyof HTMLElementEventMap;
    callback: (event: Event) => void;
}> = [];

/**
 * @function AddSignal
 *
 * @export
 * @param {HTMLElement} element
 * @param {keyof HTMLElementEventMap} type
 * @param {(event: Event) => void} callback
 * @return {(event: Event) => void}
 */
export function AddSignal(
    element: HTMLElement,
    type: keyof HTMLElementEventMap,
    callback: (event: Event) => void
): (event: Event) => void {
    element.addEventListener(type, callback);

    // add to store
    ListenerStore.push({
        element,
        type,
        callback,
    });

    // return listener
    return callback;
}

/**
 * @function RemoveSignal
 *
 * @export
 * @param {HTMLElement} element
 * @param {keyof HTMLElementEventMap} type
 * @param {(event: Event) => void} listener
 * @return {boolean}
 */
export function RemoveSignal(
    element: HTMLElement,
    type: keyof HTMLElementEventMap,
    listener: (event: Event) => void
): boolean {
    // remove listener from array
    const StoredListener = ListenerStore.find(
        (l) => l.type === type && l.callback === listener
    );

    if (StoredListener) ListenerStore.splice(ListenerStore.indexOf(StoredListener));

    // remove event listener
    element.removeEventListener(type, listener);

    // return
    return true;
}

/**
 * @function ClearSignals
 * @export
 */
export function ClearSignals() {
    // remove all signals
    for (const signal of ListenerStore)
        RemoveSignal(signal.element, signal.type, signal.callback);
}

// default export
export default {
    AddSignal,
    RemoveSignal,
    ClearSignals,
};
