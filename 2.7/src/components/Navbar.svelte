<div>
    <ul>
    {#if !user.isAuth }
        <li>
            <a href="#">Login</a>
        </li>
    {:else}
        <li>
            <Navlink
                href={'#'}
                text={'Dashboard'}
                active={current === 'Dashboard'}
                on:activate={changeCurrent}
            />
        </li>
        <li>
            <Navlink
                href={'#'}
                text={'Profile'}
                active={current === 'Profile'}
                on:activate={changeCurrent}
            />
        </li>
        <li>
            <Navlink
                href={'#'}
                text={'Logout'}
                active={current === 'Logout'}
                on:activate={changeCurrent}
            />
        </li>


    {/if}
    </ul>
</div>

<style>
div {
    height: 20px;
    padding: 10px 15px;
    background-color: #7952B3;
}

ul {
    padding: 0;
    list-style: none;
    margin: auto 0 auto auto;
}

li {
    display: inline-block;
    margin: 0;
    padding-left: 15px;
}
</style>

<script>
import Navlink from './Navlink.svelte';
export let user = {};

let current = 'Dashboard';

function changeCurrent(event) {
    current = event.detail.text;
}
</script>