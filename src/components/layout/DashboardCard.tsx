import { Card } from "../ui/card"


type DashboardCardProp = {
    bg_color: string,
    data: number,
    legend: string,
}

export default function DashboardCard({bg_color, data, legend}: DashboardCardProp){
    return (
        <Card className={`flex flex-col ${bg_color} w-32 rounded-2xl text-right p-2 gap-2`}>
            <span className="font-header text-4xl">{data}</span>
            <span className="font-body text-sm">{legend}</span>
        </Card>
    )
}