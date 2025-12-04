import { useNavigate } from "react-router-dom";



function FilterInfo() {

    const navigate = useNavigate();
    return (
        <>
            <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default w-1/2">
                <table class="w-full text-sm text-left rtl:text-right text-body">
                    <thead class="text-sm text-body bg-neutral-secondary-medium border-b border-default-medium">
                        <tr>
                            <th scope="col" class="px-6 py-3 font-medium">
                                Product name
                            </th>
                            <th scope="col" class="px-6 py-3 font-medium">
                                Color
                            </th>
                            <th scope="col" class="px-6 py-3 font-medium">
                                Category
                            </th>
                            <th scope="col" class="px-6 py-3 font-medium">
                                Price
                            </th>
                            <th scope="col" class="px-6 py-3 font-medium">
                                <span class="sr-only">Edit</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
                            <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                Apple MacBook Pro 17"
                            </th>
                            <td class="px-6 py-4">
                                Silver
                            </td>
                            <td class="px-6 py-4">
                                Laptop
                            </td>
                            <td class="px-6 py-4">
                                $2999
                            </td>
                            <td class="px-6 py-4 text-right">
                                <a href="#" class="font-medium text-fg-brand hover:underline">Edit</a>
                            </td>
                        </tr>
                        <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
                            <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                Microsoft Surface Pro
                            </th>
                            <td class="px-6 py-4">
                                White
                            </td>
                            <td class="px-6 py-4">
                                Laptop PC
                            </td>
                            <td class="px-6 py-4">
                                $1999
                            </td>
                            <td class="px-6 py-4 text-right">
                                <a href="#" class="font-medium text-fg-brand hover:underline">Edit</a>
                            </td>
                        </tr>
                        <tr class="bg-neutral-primary-soft hover:bg-neutral-secondary-medium">
                            <th scope="row" class="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                Magic Mouse 2
                            </th>
                            <td class="px-6 py-4">
                                Black
                            </td>
                            <td class="px-6 py-4">
                                Accessories
                            </td>
                            <td class="px-6 py-4">
                                $99
                            </td>
                            <td>
                                <button className="btn btn-outline w-full" onClick={() => navigate("/FilterInfo")}>Load filter information</button>
                                <button className="btn btn-outline w-full" onClick={() => navigate("/AHU")}>Back</button>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <a href="#" class="font-medium text-fg-brand hover:underline">Edit</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </>
    )
}


export default FilterInfo;