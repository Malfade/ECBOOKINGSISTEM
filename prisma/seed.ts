import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clean existing data
    await prisma.lesson.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.group.deleteMany();
    await prisma.room.deleteMany();

    // Create Rooms
    const room101 = await prisma.room.create({
        data: {
            name: 'Аудитория 101',
            location: 'Корпус A, 1 этаж',
            description: 'Лекционная аудитория на 50 человек'
        }
    });

    const room205 = await prisma.room.create({
        data: {
            name: 'Аудитория 205',
            location: 'Корпус B, 2 этаж',
            description: 'Компьютерный класс'
        }
    });

    const room301 = await prisma.room.create({
        data: {
            name: 'Аудитория 301',
            location: 'Корпус A, 3 этаж',
            description: 'Малая аудитория на 25 человек'
        }
    });

    console.log('✓ Created rooms');

    // Create Groups
    const group_is21 = await prisma.group.create({
        data: {
            name: 'ИС-21',
            course: 2,
            description: 'Информационные системы, 2 курс'
        }
    });

    const group_pm31 = await prisma.group.create({
        data: {
            name: 'ПМ-31',
            course: 3,
            description: 'Прикладная математика, 3 курс'
        }
    });

    const group_pi11 = await prisma.group.create({
        data: {
            name: 'ПИ-11',
            course: 1,
            description: 'Программная инженерия, 1 курс'
        }
    });

    console.log('✓ Created groups');

    // Create Schedule for ИС-21
    await prisma.lesson.createMany({
        data: [
            // Monday
            {
                groupId: group_is21.id,
                roomId: room101.id,
                day: 'monday',
                timeStart: '09:00',
                timeEnd: '10:30',
                subject: 'Математический анализ',
                teacher: 'Проф. Иванов И.И.'
            },
            {
                groupId: group_is21.id,
                roomId: room205.id,
                day: 'monday',
                timeStart: '11:00',
                timeEnd: '12:30',
                subject: 'Программирование',
                teacher: 'Доц. Петрова А.С.'
            },
            // Tuesday
            {
                groupId: group_is21.id,
                roomId: room101.id,
                day: 'tuesday',
                timeStart: '09:00',
                timeEnd: '10:30',
                subject: 'Базы данных',
                teacher: 'Проф. Сидоров П.К.'
            },
            {
                groupId: group_is21.id,
                roomId: room301.id,
                day: 'tuesday',
                timeStart: '13:00',
                timeEnd: '14:30',
                subject: 'Английский язык',
                teacher: 'Смирнова Е.В.'
            },
            // Wednesday
            {
                groupId: group_is21.id,
                roomId: room205.id,
                day: 'wednesday',
                timeStart: '10:00',
                timeEnd: '11:30',
                subject: 'Алгоритмы и структуры данных',
                teacher: 'Доц. Козлов Д.М.'
            },
            // Thursday
            {
                groupId: group_is21.id,
                roomId: room101.id,
                day: 'thursday',
                timeStart: '09:00',
                timeEnd: '10:30',
                subject: 'Операционные системы',
                teacher: 'Проф. Новиков В.А.'
            },
            // Friday
            {
                groupId: group_is21.id,
                roomId: room205.id,
                day: 'friday',
                timeStart: '11:00',
                timeEnd: '12:30',
                subject: 'Веб-разработка',
                teacher: 'Доц. Морозова Т.И.'
            }
        ]
    });

    // Create Schedule for ПМ-31
    await prisma.lesson.createMany({
        data: [
            {
                groupId: group_pm31.id,
                roomId: room101.id,
                day: 'monday',
                timeStart: '13:00',
                timeEnd: '14:30',
                subject: 'Дифференциальные уравнения',
                teacher: 'Проф. Лебедев А.В.'
            },
            {
                groupId: group_pm31.id,
                roomId: room301.id,
                day: 'tuesday',
                timeStart: '11:00',
                timeEnd: '12:30',
                subject: 'Численные методы',
                teacher: 'Доц. Волкова М.П.'
            },
            {
                groupId: group_pm31.id,
                roomId: room205.id,
                day: 'wednesday',
                timeStart: '14:00',
                timeEnd: '15:30',
                subject: 'Теория вероятностей',
                teacher: 'Проф. Зайцев Н.С.'
            }
        ]
    });

    // Create Schedule for ПИ-11
    await prisma.lesson.createMany({
        data: [
            {
                groupId: group_pi11.id,
                roomId: room301.id,
                day: 'monday',
                timeStart: '10:00',
                timeEnd: '11:30',
                subject: 'Введение в программирование',
                teacher: 'Соколова К.Л.'
            },
            {
                groupId: group_pi11.id,
                roomId: room101.id,
                day: 'wednesday',
                timeStart: '13:00',
                timeEnd: '14:30',
                subject: 'Дискретная математика',
                teacher: 'Проф. Орлов С.Д.'
            }
        ]
    });

    console.log('✓ Created lessons');

    console.log('✅ Seeding completed successfully!');
    console.log('\nCreated:');
    console.log(`- ${await prisma.room.count()} rooms`);
    console.log(`- ${await prisma.group.count()} groups`);
    console.log(`- ${await prisma.lesson.count()} lessons`);
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
